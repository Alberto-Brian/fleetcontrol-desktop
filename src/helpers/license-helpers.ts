// ========================================
// PROJECT: fleetcontrol-desktop
// FILE: src/helpers/license-helpers.ts
// ========================================

import axios, { AxiosError } from 'axios';
import { toast } from 'sonner';
// i18next's own default export IS the shared singleton instance that
// localization/i18n.ts configures as a side effect on app boot — importing
// it directly here avoids needing an export this plain module doesn't have.
import i18n from 'i18next';
import type { ValidatedLicense } from '@/lib/types/licence';
import { wipeAllLocalUnlockRecords } from '@/helpers/local-users-helpers';
import { deleteCompanySettings, updateCompanySettings } from '@/helpers/company-helpers';
import { resetSystemSettings } from '@/helpers/system-settings-helpers';

// Um AxiosError inteiro, quando logado, imprime config.headers (Authorization:
// Bearer …) e config.data (ex. refresh_token) — nunca logar o objecto; só o
// estado HTTP ou a mensagem.
function safeErr(err: unknown): string {
  const e = err as { response?: { status?: number }; message?: string };
  if (e?.response?.status) return `HTTP ${e.response.status}`;
  return e?.message ?? String(err);
}

// Fase 11B.11 — disparado quando o servidor recusa explicitamente a sessão
// actual (revogada por um admin, ou expirada) enquanto online. AuthContext
// escuta este evento para devolver a app ao ecrã de login — uma sessão
// morta não deve deixar a pessoa "presa" dentro da app com a API partida.
export const SESSION_REVOKED_EVENT = 'fc:session-revoked';

// Achado real (2026-09-08): LicenseGuard só tenta ligar o socket de
// tracking UMA VEZ (o seu próprio efeito só corre de novo se `license`/
// `licenseLoading` mudarem, nunca só porque um token passou a existir) — se
// getAccessToken() ainda for null nesse único momento (uma corrida comum:
// isAuthenticated já é true via restauro local, mas o token online ainda
// está a ser obtido/reactivado em segundo plano), a app fica sem ligação de
// tracking pelo resto da sessão, mesmo que a sessão fique válida segundos
// (ou até 60s, com o retry de tryRefreshOrReactivate()) depois. Disparado
// sempre que _accessToken passa a ter um valor real com sucesso —
// LicenseGuard volta a tentar connect() quando ouve isto.
export const SESSION_TOKEN_READY_EVENT = 'fc:session-token-ready';

// ── URL dinâmica — resolvida via IPC ─────────────────────────────────────────
let _resolvedApiUrl: string | null = null;

async function resolveApiUrl(): Promise<string> {
  if (_resolvedApiUrl) return _resolvedApiUrl;
  try {
    const saved: string | undefined = await (window as any).system?.getServerUrl?.();
    _resolvedApiUrl = (saved && saved.trim()) ? saved.trim() : 'http://localhost:3001';
  } catch {
    _resolvedApiUrl = 'http://localhost:3001';
  }
  return _resolvedApiUrl!;
}

export function resetApiUrl(): void {
  _resolvedApiUrl = null;
}

// Achado real (2026-09-10): resetApiUrl() já existia mas nunca era chamada
// em lado nenhum — este apiClient (login, probeApiReachable,
// tryRefreshOrReactivate, activateOnApi, tudo) ficava preso ao primeiro URL
// resolvido para sempre, mesmo depois de SettingsDialog.tsx disparar
// 'serverUrlChanged' ao Guardar um URL novo (esse evento só era ouvido
// pelo socket do tracking, useApiConnection.ts). Sintoma exacto: mudar o
// URL do servidor nas Definições e Guardar corretamente, mas login/
// "Servidor inacessível" continuavam a apontar para o valor antigo.
if (typeof window !== 'undefined') {
  window.addEventListener('serverUrlChanged', () => resetApiUrl());
}

const apiClient = axios.create({
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config) => {
  config.baseURL = await resolveApiUrl();
  return config;
});

// 2026-09-13 — "se este estiver logado no desktop deve deslogar
// automaticamente": sem isto, uma sessão revogada (ex. um admin
// desactivou/eliminou este utilizador em organization-admin) só era
// notada da PRÓXIMA vez que tryRefreshOrReactivate() corresse — até
// ~7h55 depois (scheduleRefresh só dispara ~5min antes de expirar o
// access_token de 8h). O authMiddleware da API já rejeita a sessão em
// QUALQUER pedido autenticado (não só /refresh) — mas os pedidos REST
// do dia-a-dia (vehicles-listeners.ts, tracking-listeners.ts,
// api-sync-queue.ts) e o PowerSyncBackendConnector (connector.ts) usam
// todos o `axios` por omissão directamente (import axios from 'axios'),
// nunca este `apiClient` (uma instância própria, via axios.create() —
// intercepta só os SEUS próprios pedidos, nunca os de outra instância).
// Um interceptor global no `axios` por omissão apanha esses pedidos
// avulsos sem precisar de tocar em cada ficheiro — o PRÓXIMO pedido de
// QUALQUER um deles (normalmente segundos depois, não horas) já dispara
// o mesmo logout. Nunca duplica com o tratamento já existente em
// tryRefreshOrReactivateImpl (que usa `apiClient`, uma instância
// diferente, com a sua própria cadeia de interceptors, independente
// desta).
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const axiosErr = error as AxiosError<{ code?: string }>;
    const code = axiosErr.response?.data?.code;
    if (axiosErr.response?.status === 401 && (code === 'SESSION_REVOKED' || code === 'REFRESH_EXPIRED')) {
      await handleSessionRevoked(code);
    }
    return Promise.reject(error);
  },
);

// Extraído de tryRefreshOrReactivateImpl (2026-09-13) para ser partilhado
// pelo interceptor global acima — mesmo comportamento em qualquer pedido
// que descubra a sessão revogada, não só no /refresh explícito.
async function handleSessionRevoked(code: 'REFRESH_EXPIRED' | 'SESSION_REVOKED'): Promise<void> {
  await clearApiSession();

  if (code === 'REFRESH_EXPIRED') {
    toast.error(i18n.t('auth:session.toast.expiredTitle'), {
      description: i18n.t('auth:session.toast.expiredDescription'),
      duration: 10000,
    });
  } else {
    toast.error(i18n.t('auth:session.toast.revokedTitle'), {
      description: i18n.t('auth:session.toast.revokedDescription'),
      duration: 10000,
    });
  }

  window.dispatchEvent(new Event(SESSION_REVOKED_EVENT));
}

// ── Tokens em memória ─────────────────────────────────────────────────────────
let _accessToken:  string | null = null;
let _refreshToken: string | null = null;
let _refreshTimer: ReturnType<typeof setTimeout> | null = null;

export function getAccessToken(): string | null { return _accessToken; }

// ── Estado da sessão API (organização + troca de password obrigatória) ──────
// Preenchido só por loginOnApi() — nunca por tryRestoreCachedSession() (a
// sessão cacheada nunca é a primeira confirmação destes dois campos vindos
// do servidor; um must_change_password pendente só é conhecido com certeza
// numa ligação real). _currentOrganizationId existe só para o cross-check em
// validateDisplayKey() abaixo — nunca usado para autorização (isso continua
// a ser inteiramente do lado da API).
let _currentOrganizationId: string | null = null;
let _mustChangePassword = false;

export function getMustChangePassword(): boolean { return _mustChangePassword; }
function resetSessionMetadata(): void {
  _currentOrganizationId = null;
  _mustChangePassword = false;
  _permissions = null;
  _accessScopes = null;
}

// ── Permissões efectivas do utilizador (gating de UI, 2026-09-18) ───────────
// Achado real: nenhuma tela do Desktop escondia acções (ex. "Adicionar GPS"/
// "Remover GPS") consoante a permissão de quem estava autenticado — qualquer
// sessão válida via botão, e só descobria não ter `vehicle:link-device`/
// `unlink-device` ao clicar (403/404 do servidor). GET /api/auth/me/access
// já existe no backend, construído explicitamente para isto ("para UX, nunca
// substituto de enforcement" — FindMyAccessUseCase); o servidor continua a
// ser sempre a autoridade real em cada UseCase, isto é só para a UI não
// oferecer acções que o clique vai recusar de qualquer forma.
let _permissions: string[] | null = null;

export function getCachedPermissions(): string[] | null { return _permissions; }

// 2026-09-19 — pedido do utilizador: mostrar cargos/permissões/scopes no
// perfil, "para saber exactamente o que pode ou não fazer no sistema". A
// API nunca devolve nome de Role em /me/access de propósito (Fase 8 —
// modelo ALLOW-union não guarda qual Role originou um grant já resolvido),
// por isso o perfil mostra Scopes (cada um com as suas permissões), não
// "cargos" — o mesmo que a própria API expõe, nada inventado no cliente.
export interface ICachedAccessScope {
  id: string;
  name: string;
  type: 'organization' | 'resource_set';
  permissions: string[];
}

let _accessScopes: ICachedAccessScope[] | null = null;

export function getCachedAccessScopes(): ICachedAccessScope[] | null { return _accessScopes; }

// Sem lista carregada ainda (arranque a frio, ainda sem ligação) — falha
// aberto: esconder a acção só porque a lista ainda não chegou seria pior UX
// do que mostrá-la e deixar o backend decidir no clique, como já acontecia
// antes desta alteração. Só depois de a lista chegar é que uma ausência
// explícita da permissão esconde a acção.
export function hasCachedPermission(code: string): boolean {
  if (_permissions === null) return true;
  return _permissions.includes(code);
}

// 2026-09-19 — reforçado com retry: sem isto, uma única falha transitória
// (rede, um blip do servidor mesmo a meio de um deploy) deixava
// `_permissions` preso em `null` para o resto da sessão — e como
// `hasCachedPermission()` falha aberto enquanto `null` (deliberado, ver
// acima), isso significa "nunca mais esconder nada", indistinguível de um
// bug de gating. 3 tentativas com espaçamento crescente antes de desistir.
async function fetchAndCachePermissions(attempt = 1): Promise<void> {
  if (!_accessToken) return;
  if (attempt === 1) _lastPermissionsFetch = Date.now();
  try {
    const { data } = await apiClient.get('/api/auth/me/access', {
      headers: { Authorization: `Bearer ${_accessToken}` },
    });
    _permissions = data?.data?.permissions ?? [];
    _accessScopes = data?.data?.scopes ?? [];
    window.dispatchEvent(new Event(PERMISSIONS_READY_EVENT));
    void syncCompanyProfile();
  } catch (err) {
    console.warn(`[License] Falha ao obter permissões efectivas (tentativa ${attempt}):`, safeErr(err));
    if (attempt < 3) {
      setTimeout(() => { void fetchAndCachePermissions(attempt + 1); }, 3000 * attempt);
    }
  }
}

export const PERMISSIONS_READY_EVENT = 'fc:permissions-ready';

// 2026-11-16 — os dados da empresa (cabeçalho dos relatórios) passam a vir da
// organização no servidor, editados no organization-admin. Vão sendo trazidos
// nos mesmos momentos das permissões (entrada, foco, a cada 5 min) e gravados
// na cópia local — offline os relatórios usam a última versão conhecida. O
// logótipo não vem daqui: continua definido em cada posto.
async function syncCompanyProfile(): Promise<void> {
  if (!_accessToken) return;
  try {
    const { data } = await apiClient.get('/api/auth/me/organization', {
      headers: { Authorization: `Bearer ${_accessToken}` },
    });
    const org = data?.data;
    if (!org?.name) return;
    await updateCompanySettings({
      company_name: org.name,
      tax_id:       org.tax_id ?? null,
      phone:        org.phone ?? null,
      email:        org.email ?? null,
      address:      org.address ?? null,
      city:         org.city ?? null,
      state:        org.state ?? null,
      postal_code:  org.postal_code ?? null,
    });
    window.dispatchEvent(new Event(COMPANY_PROFILE_SYNCED_EVENT));
  } catch (err) {
    // Sem ligação ou API antiga sem este endpoint: mantém a cópia local.
    console.warn('[License] Não foi possível actualizar os dados da empresa:', safeErr(err));
  }
}

export const COMPANY_PROFILE_SYNCED_EVENT = 'fc:company-profile-synced';

// Um único ponto de escuta em vez de chamar fetchAndCachePermissions() nos 3
// sítios que já disparam SESSION_TOKEN_READY_EVENT (login, restauro de cache,
// refresh) — mesma ideia de LicenseGuard a ouvir este evento para o socket.
if (typeof window !== 'undefined') {
  window.addEventListener(SESSION_TOKEN_READY_EVENT, () => { void fetchAndCachePermissions(); });
}

// 2026-11-15 — a cópia local das permissões só era relida no login e na
// renovação da sessão (~8h): uma permissão dada/retirada por um administrador
// demorava horas a reflectir-se nos botões e no bloqueio antes de gravar
// (permission-guard.ts). O servidor sempre decidiu pelo estado actual em cada
// pedido — isto só actualiza a cópia usada para a UI, sem novo login.
// Gatilhos, todos baratos (um GET pequeno a /api/auth/me/access):
//   - a cada 5 min, só com a janela visível e com ligação;
//   - quando a janela volta a ficar activa ou a ligação regressa;
//   - logo após uma acção recusada pelo servidor (SyncNotifier, force=true).
// MIN_GAP evita pedidos repetidos quando vários gatilhos coincidem.
const PERMISSIONS_REFRESH_MS = 5 * 60_000;
const PERMISSIONS_MIN_GAP_MS = 30_000;
let _lastPermissionsFetch = 0;

export function refreshCachedPermissions(force = false): void {
  if (!_accessToken) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  if (!force && Date.now() - _lastPermissionsFetch < PERMISSIONS_MIN_GAP_MS) return;
  void fetchAndCachePermissions();
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  setInterval(() => {
    if (document.visibilityState === 'visible') refreshCachedPermissions();
  }, PERMISSIONS_REFRESH_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshCachedPermissions();
  });
  window.addEventListener('focus', () => refreshCachedPermissions());
  window.addEventListener('online', () => refreshCachedPermissions());
}

// Organização da LICENÇA activa deste dispositivo (não da sessão — essa é
// _currentOrganizationId acima, e reinicia a cada logout). Preenchida por
// validateDisplayKey()/activateOnApi() sempre que a licença é confirmada
// com o servidor; nunca reiniciada por um logout normal, só por
// removeLicense(). Único portão que decide QUEM pode sequer tentar login
// neste dispositivo — ver AuthContext.login().
let _licensedOrganizationId: string | null = null;
export function getLicensedOrganizationId(): string | null { return _licensedOrganizationId; }

// ── Machine ID ───────────────────────────────────────────────────────────────
export function getMachineId(): string {
  const KEY = '_fc_machine_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

const DISPLAY_KEY_RE = /^LK-[A-F0-9]{5}(-[A-F0-9]{5}){4}$/i;

function authHeaders() {
  return _accessToken ? { Authorization: `Bearer ${_accessToken}` } : {};
}

// Lê (sem verificar assinatura — impossível offline, sem o segredo do
// servidor) só o payload de um JWT, para consultar o seu próprio `exp`. Não
// é uma decisão de autorização — é só um pré-filtro para saber se vale a
// pena tentar reutilizar um token cacheado; o servidor continua a validar
// assinatura + sessão em cada pedido real quando a ligação volta.
function decodeJwtExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(payload.length + (4 - (payload.length % 4)) % 4, '=');
    const json = JSON.parse(atob(b64));
    return typeof json.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

// ── Seats (utilizadores concorrentes, Fase 11B.3/11B.6) ─────────────────────
// Achado real (2026-09-12): a secção "Desktops activos" (SettingsDialog)
// usava getActivations()/revokeActivation() — desktop_activations, o modelo
// ANTIGO por máquina — para mostrar "X/Y desktop(s) em uso" e revogar por
// password. Desde a Fase 11B.7, machine_id é só metadado operacional/
// histórico, NUNCA gate de seat; os seats reais são por UTILIZADOR
// CONCORRENTE (Fase 11B.3), consultáveis em GET /api/licenses/seats. Essas
// duas funções (e o tipo DesktopActivation) foram removidas — confirmado
// sem outros chamadores — substituídas pelas duas abaixo.

export interface ILicenseSeatSession {
  id:               string;
  clientType:       string;
  clientIdentifier: string | null;
  createdAt:        string;
  lastSeenAt:       string;
}

export interface ILicenseSeatUser {
  userId:   string;
  name:     string;
  email:    string;
  sessions: ILicenseSeatSession[];
}

export interface ILicenseSeats {
  used:  number;
  max:   number;
  users: ILicenseSeatUser[];
}

// GET /api/licenses/seats exige a permission `session:read` (org-only, só o
// Administrador tem por omissão no catálogo — Fase 11B.6) — um utilizador
// sem essa permission recebe 403, e quem chama esta função deve tratar
// isso como "não mostrar a secção", nunca como um erro a expor. É assim
// que "só utilizadores permitidos podem ver esta informação" é garantido:
// o backend é a única autoridade (mesmo princípio já aplicado em toda a
// autorização deste projecto), nunca uma verificação feita aqui no cliente.
export async function getLicenseSeats(): Promise<ILicenseSeats> {
  const { data } = await apiClient.get('/api/licenses/seats', { headers: authHeaders() });
  return data.data as ILicenseSeats;
}

// DELETE /api/sessions/:id exige `session:revoke` (Alto risco no catálogo,
// só o Administrador por omissão) — mesma disciplina: o backend decide,
// esta função só propaga o 403 se o chamador não tiver a permission.
export async function revokeSession(sessionId: string): Promise<void> {
  await apiClient.delete(`/api/sessions/${sessionId}`, { headers: authHeaders() });
}

// 2026-09-20 — achado real: o "Sair" do Desktop nunca chamava isto, só
// limpava os tokens locais (clearApiSession()) — a sessão no servidor
// nunca era revogada, só expirava sozinha (30 dias, ou 12h sem uso). Efeito
// visível: a lista "Sessões activas" (LicenseTab) crescia sem nunca
// encolher, mesmo depois de várias pessoas fazerem logout normalmente.
// POST /api/auth/logout é público (Fase 11B.5) — não exige authMiddleware,
// só o próprio refresh_token no corpo, porque o access_token pode já estar
// expirado no momento em que a pessoa quer sair. Chamar SEMPRE antes de
// clearApiSession() apagar _refreshToken da memória — depois disso já não
// há nada para enviar. Falha silenciosa (rede em baixo, etc.) — um logout
// nunca deve ficar "preso" à espera do servidor; a sessão expira sozinha
// de qualquer forma se este pedido não chegar.
export async function logoutOnApi(): Promise<void> {
  if (!_refreshToken) return;
  try {
    await apiClient.post('/api/auth/logout', { refresh_token: _refreshToken });
  } catch {
    // Sem sessão para revogar, ou API inacessível — o logout local continua.
  }
}

// ── Validação e activação ─────────────────────────────────────────────────────

export async function validateLicense(licenseKey: string): Promise<ValidatedLicense> {
  const key = licenseKey.trim();
  const result = await validateLicenseImpl(key);

  // Achado real (2026-09-12): activar uma licença (nova ou re-inserida)
  // podia deixar um utilizador com sessão iniciada, ligado a uma
  // Organization DIFERENTE (a da licença antiga) — a licença já mudou de
  // Organization, mas o utilizador continuava logado, potencialmente sem
  // sequer pertencer à Organization nova. `validateLicense()` só é chamada
  // a partir de `LicenseActivationDialog` (a UI de entrada explícita da
  // chave) — nunca do fluxo automático de reactivação em segundo plano
  // (`tryRefreshOrReactivate`/`activateOnApi` sozinho), por isso reutilizar
  // SESSION_REVOKED_EVENT aqui nunca desloga alguém só por uma
  // confirmação de licença rotineira. AuthContext.logout() (o único
  // listener deste evento) é seguro chamar mesmo sem ninguém com sessão
  // iniciada — no-op nesse caso.
  if (result.isValid) window.dispatchEvent(new Event(SESSION_REVOKED_EVENT));

  return result;
}

async function validateLicenseImpl(key: string): Promise<ValidatedLicense> {
  if (DISPLAY_KEY_RE.test(key)) {
    return validateDisplayKey(key);
  }

  const localResult: ValidatedLicense = await window.license.validateLicense(key);
  if (!localResult.isValid) return localResult;

  await activateOnApi(key);
  return localResult;
}

export async function checkExistingLicense(): Promise<ValidatedLicense> {
  const result: ValidatedLicense = await window.license.checkExistingLicense();
  if (!result.isValid) return result;

  await tryRefreshOrReactivate();

  return result;
}

// ── Login por utilizador (Fase 11B.8) ──────────────────────────────────────
// Substitui, para efeitos de identidade em chamadas API/Traccar, o token do
// admin sintético (emitido só por /activate) por um token do utilizador real
// que fez login no Desktop — reaproveita o mesmo apiClient/tokens em memória/
// scheduleRefresh já usados pelo fluxo de activação, para nunca haver duas
// fontes de token concorrentes.
export interface ApiLoginResult {
  success: boolean;
  code?: string;
  message?: string;
  // Fase 11B.10 — presente só em sucesso; quem chama usa isto para
  // sincronizar o "cadeado" local (nunca para decidir role/scope/
  // permissions, que o Desktop nunca lê localmente). organizationId serve
  // só para AuthContext.login() decidir se os dados locais do PowerSync
  // ficam ou são apagados (mesma Organization = ficam) — nunca para
  // autorização, que continua inteiramente do lado da API.
  user?: { name: string; email: string; organizationId: string | null };
  // true quando a API devolve must_change_password:true (ex: password
  // temporária de bootstrap, Fase 8B.3) — quem chama deve bloquear o resto
  // da app até uma troca bem-sucedida (changePasswordOnApi abaixo).
  mustChangePassword?: boolean;
}

export async function loginOnApi(email: string, password: string): Promise<ApiLoginResult> {
  try {
    const { data } = await apiClient.post('/api/auth/login', {
      email,
      password,
      // client_identifier — mesmo machine_id da activação, metadado puro
      // (a API nunca usa isto para decidir seats/autorização, Fase 11B.2).
      client_identifier: getMachineId(),
    });

    _accessToken  = data.access_token;
    _refreshToken = data.refresh_token;
    _currentOrganizationId = data.user.organizationId ?? null;
    _mustChangePassword    = !!data.user.must_change_password;
    await window._service_auth.setToken(data.access_token);
    scheduleRefresh(data.expires_in);
    window.dispatchEvent(new Event(SESSION_TOKEN_READY_EVENT));

    // Fase 11B.9 — cacheia esta sessão (cifrada, safeStorage) para poder
    // ser reutilizada num próximo arranque/login sem ligação à API.
    await window._service_auth.saveCachedSession({
      access_token:  data.access_token,
      refresh_token: data.refresh_token,
      user: { id: data.user.id, email: data.user.email, name: data.user.name, organizationId: _currentOrganizationId },
      cached_at: Date.now(),
    });

    // Fase 12, Prompt 22.8 — só depois de haver um access_token de sessão
    // real (token-store.ts já actualizado acima via setToken) é que o
    // PowerSyncBackendConnector consegue chamar fetchCredentials() com
    // sucesso. Fire-and-forget deliberado: o próprio PowerSync já trata uma
    // falha aqui (ex. serviço PowerSync ainda não disponível) como
    // transitória e tenta de novo sozinho — nunca deve poder bloquear ou
    // reprovar o login por si só.
    void window._service_powersync.connect();

    return {
      success: true,
      user: { name: data.user.name, email: data.user.email, organizationId: _currentOrganizationId },
      mustChangePassword: _mustChangePassword,
    };
  } catch (err) {
    const axiosErr = err as AxiosError<{ message?: string; code?: string } | string>;

    if (!axiosErr.response || axiosErr.response.status >= 500) {
      // Achado real (2026-09-05): sem internet, mas com o servidor
      // self-hosted acessível na LAN (o container fica de pé mesmo sem
      // acesso ao Neon), o pedido chega e RECEBE uma resposta — só que um
      // 500 genuíno, porque AuthUseCase.authenticate() falha a ligar à
      // base de dados real. `axiosErr.response` estava presente, por isso
      // este caso caía sempre no ramo "API recusou" (bloqueia, nunca cai
      // para o cache offline) mostrando o "Internal Server Error" bruto do
      // Fastify em vez de reaproveitar a sessão cacheada. Um 5xx nunca é
      // uma decisão de negócio sobre as credenciais (isso é sempre 4xx —
      // 401/403/429) — é o servidor a falhar a decidir, o que para quem
      // chama deve valer exactamente como "API inacessível".
      return { success: false, code: 'OFFLINE', message: 'API inacessível.' };
    }

    // Nem toda resposta de erro da API é {message, code} — o rate limit
    // (authRateLimit.ts) devolve texto simples no corpo, não um objecto.
    // Sem isto, response.data?.message dava sempre undefined numa string e
    // caía silenciosamente no "Credenciais inválidas." genérico, escondendo
    // o motivo real (ex: limite de pedidos atingido).
    const responseData = axiosErr.response.data;
    const message = typeof responseData === 'string'
      ? responseData
      : responseData?.message || 'Credenciais inválidas.';
    const code = typeof responseData === 'string' ? undefined : responseData?.code;

    return { success: false, code, message };
  }
}

// Fase 11B.9 — reutiliza, enquanto offline, uma sessão API previamente
// autenticada com sucesso e cacheada localmente (safeStorage). Nunca cria
// uma identidade nova por si só: só adopta uma sessão já emitida pelo
// servidor, e só quando pertence à MESMA pessoa que está a autenticar-se
// agora (email cacheado === email fornecido) — essencial num Desktop
// partilhado, para o login offline de uma pessoa nunca herdar a sessão
// cacheada de outra. Validade decidida pelo próprio `exp` do refresh_token
// (a política de 30 dias já definida no backend, signRefreshToken) — nunca
// uma duração inventada aqui.
// Nunca lança — uma falha aqui (ex. IPC indisponível num arranque muito
// cedo) nunca deve poder derrubar o login local já bem-sucedido de quem
// chamou; devolve simplesmente "não foi possível reaproveitar", o mesmo
// resultado de não haver cache nenhuma.
export async function tryRestoreCachedSession(expectedEmail: string): Promise<boolean> {
  try {
    const cached = await window._service_auth.getCachedSession();
    if (!cached) return false;
    if (cached.user.email.toLowerCase() !== expectedEmail.trim().toLowerCase()) return false;

    const expiresAt = decodeJwtExpiry(cached.refresh_token);
    if (!expiresAt || expiresAt <= Date.now()) {
      // Sessão cacheada expirada segundo a própria política do backend —
      // não reutilizável; quem chamou cai para o comportamento sem sessão API.
      return false;
    }

    _accessToken  = cached.access_token;
    _refreshToken = cached.refresh_token;
    await window._service_auth.setToken(cached.access_token);
    window.dispatchEvent(new Event(SESSION_TOKEN_READY_EVENT));

    // Se afinal houver ligação (ex.: falso negativo no momento do login, ou
    // é um arranque a frio e a conectividade ainda não foi testada), tenta
    // logo obter um access_token fresco — falha silenciosamente se continuar
    // offline, mantendo os tokens cacheados tal como estavam.
    void tryRefreshOrReactivate();

    // Fase 12, Prompt 22.8 — mesmo raciocínio de loginOnApi(): reaproveitar
    // uma sessão cacheada também deixa um access_token utilizável em
    // token-store.ts, por isso também dispara connect(). Enquanto
    // genuinamente offline, fetchCredentials() falha e o PowerSync fica a
    // tentar em segundo plano com o seu próprio backoff — liga sozinho assim
    // que tryRefreshOrReactivate() acima (ou o listener de 'online') obtiver
    // ligação real.
    void window._service_powersync.connect();

    return true;
  } catch (err) {
    console.warn('[License] Falha ao reaproveitar sessão cacheada:', safeErr(err));
    return false;
  }
}

// Limpa a sessão API do utilizador que acabou de terminar sessão no Desktop,
// SEM tocar na activação da licença em si (isso é removeLicense() — logout
// de um utilizador nunca deve desactivar a licença da máquina). Essencial
// num Desktop partilhado por vários utilizadores: sem isto, o próximo login
// herdaria o token/refresh do utilizador anterior até ao próximo refresh
// agendado.
// Troca a password do utilizador com sessão iniciada — usado sobretudo pelo
// gate de must_change_password (password temporária de bootstrap, Fase
// 8B.3), mas serve qualquer troca de password autenticada. Em sucesso, o
// próprio backend já limpa must_change_password (IAuthRepository.
// updatePasswordHash, Fase 8B.3) — replicamos isso aqui só para o estado em
// memória deste processo não ficar desalinhado até ao próximo login.
export async function changePasswordOnApi(currentPassword: string, newPassword: string): Promise<void> {
  await apiClient.post('/api/auth/change-password', { currentPassword, newPassword }, { headers: authHeaders() });
  _mustChangePassword = false;
}

// Achado real (2026-09-0X): esta função apagava sempre a cache de sessão
// E os dados locais do PowerSync, em TODO logout — incluindo quando a
// mesma pessoa, na mesma máquina, volta a entrar a seguir (o caso mais
// comum). Consequência directa: sair e voltar a entrar com a API em baixo
// mostrava sempre tudo a zero — a cache que tryRestoreCachedSession()
// precisava tinha acabado de ser apagada por este próprio logout, e os
// dados locais também. clearApiSession() passa a limpar só a sessão em
// MEMÓRIA (nunca mais utilizável de qualquer forma depois de um logout) —
// a cache e os dados locais só são apagados quando uma identidade
// DIFERENTE é confirmada (ver wipeLocalDataForIdentitySwitch(), chamado
// por AuthContext.login() só depois de um login ONLINE bem-sucedido — o
// único momento em que se sabe com segurança quem é a pessoa nova).
export async function clearApiSession(): Promise<void> {
  _accessToken  = null;
  _refreshToken = null;
  resetSessionMetadata();
  await window._service_auth.setToken(null);
  if (_refreshTimer) clearTimeout(_refreshTimer);
}

// Lido antes de loginOnApi() (que já sobrescreve a cache com a sessão de
// quem está a entrar agora) — só assim é possível comparar "quem estava"
// com "quem está a entrar agora". organizationId (não email) é quem decide
// se os dados locais ficam: dois utilizadores da mesma Organization nunca
// devem perder a cache um do outro — só uma Organization diferente
// justifica apagar (ver wipeLocalDataForIdentitySwitch() abaixo).
export async function peekCachedSessionIdentity(): Promise<{ email: string; organizationId: string | null } | null> {
  try {
    const cached = await window._service_auth.getCachedSession();
    if (!cached) return null;
    return { email: cached.user.email, organizationId: cached.user.organizationId ?? null };
  } catch {
    return null;
  }
}

// Chamado só depois de confirmar (login online bem-sucedido) que quem
// entrou agora é de uma Organization diferente da última sessão guardada —
// nunca deixar os dados locais dela visíveis a quem entrou a seguir num
// Desktop partilhado. A cache da sessão em si já não precisa de limpeza
// aqui: loginOnApi() já a sobrescreveu correctamente com a sessão nova.
//
// Limitação conhecida, não resolvida aqui: dentro da MESMA Organization,
// dois utilizadores com Scope diferente (ex. um vê toda a frota, outro só
// 2 veículos) NUNCA disparam este wipe — a app confia inteiramente no
// PowerSync retirar (ou nunca ter sincronizado) as linhas que o utilizador
// novo não pode ver, através do bucket dele próprio. Este é exactamente o
// "ponto em aberto do Prompt 22.1" já referido no projecto (nunca
// confirmado empiricamente) — testar com dois utilizadores reais de Scope
// diferente, na mesma máquina, antes de confiar nisto em produção.
// 2026-09-20 — achado real: até aqui só o PowerSync era limpo aqui — a
// tabela local `users` (cadeados de quem já fez login nesta máquina) e as
// preferências locais da empresa (company_settings/system_settings)
// nunca eram tocadas, apesar de serem TAMBÉM um recurso da Organization
// anterior, não de uma pessoa — mesma razão já usada para o PowerSync,
// só nunca estendida a estes três. Numa máquina partilhada entre clientes
// (ex. revenda de hardware, ou troca de licença para outra empresa), isto
// deixava nome/email/hash de password de funcionários de uma organização
// visíveis/geríveis por quem viesse a seguir — uma fuga real de PII entre
// clientes. resetSystemSettings() repõe os valores por omissão (não há
// "apagar" para esta tabela, é sempre uma única linha); as outras duas são
// mesmo apagadas. Falhas isoladas não travam as restantes — cada limpeza é
// independente, uma falhar não deve impedir as outras de correr.
export async function wipeLocalDataForIdentitySwitch(): Promise<void> {
  await window._service_powersync.disconnectAndClear();
  await Promise.allSettled([
    wipeAllLocalUnlockRecords(),
    deleteCompanySettings(),
    resetSystemSettings(),
  ]);
}

export async function removeLicense(): Promise<void> {
  // Tenta libertar o seat no servidor antes de remover localmente
  if (_accessToken) {
    try {
      await apiClient.delete('/api/activations/me', {
        headers: authHeaders(),
        data: { machine_id: getMachineId() },
      });
    } catch {
      // Falha silenciosa — o seat pode já ter sido revogado ou a API estar offline
    }
  }

  _accessToken  = null;
  _refreshToken = null;
  resetSessionMetadata();
  _licensedOrganizationId = null;
  await window._service_auth.setToken(null);
  await window._service_auth.clearCachedSession();
  if (_refreshTimer) clearTimeout(_refreshTimer);
  // Fase 12, Prompt 22.8 — trocar/remover a licença muda potencialmente de
  // organização; os dados PowerSync sincronizados pertencem à organização
  // anterior e nunca devem sobreviver a isto.
  await window._service_powersync.disconnectAndClear();
  await window.license.removeLicense();

  // Achado real (2026-09-12): removeLicense() já limpava os tokens API
  // (acima), mas nunca o login LOCAL (AuthContext) — o utilizador ficava
  // "dentro" da app, autenticado, com uma sessão que já não corresponde a
  // nenhuma licença/Organization activa. Reutiliza o mesmo evento já usado
  // para sessão revogada remotamente — AuthContext.logout() devolve a app
  // ao ecrã de login, é seguro chamar mesmo sem ninguém com sessão iniciada.
  window.dispatchEvent(new Event(SESSION_REVOKED_EVENT));
}

// ── Lógica interna ────────────────────────────────────────────────────────────

async function validateDisplayKey(displayKey: string): Promise<ValidatedLicense> {
  try {
    const { data } = await apiClient.post('/api/auth/activate', {
      license_key: displayKey,
      machine_id:  getMachineId(),
    });

    if (!data.success) {
      return { isValid: false, error: data.message || 'Chave inválida' };
    }

    if (data.full_license) {
      const localResult: ValidatedLicense = await window.license.validateLicense(data.full_license);
      if (!localResult.isValid) return localResult;
    }

    // Licença e sessão são independentes (Fase 11B.12) — nada impedia, até
    // aqui, activar uma licença de outra Organization enquanto já havia
    // sessão iniciada como um utilizador de uma Organization diferente. Não
    // é falha de segurança (o acesso aos dados continua sempre limitado
    // pelo organizationId do JWT, nunca pela licença), mas é um estado
    // inconsistente sem aviso nenhum — rejeitamos aqui, antes de persistir
    // a licença localmente. Só verificável quando já existe sessão (login
    // sempre antes da activação, App.tsx).
    if (_currentOrganizationId && data.data.organization_id !== _currentOrganizationId) {
      return {
        isValid: false,
        error: 'Esta licença pertence a outra organização — não corresponde ao utilizador com sessão iniciada.',
      };
    }

    // Guarda qual Organization está licenciada NESTE dispositivo — é o que
    // AuthContext.login() usa para recusar o login de um utilizador de uma
    // Organization diferente (achado do utilizador, 2026-09-0X). Só
    // reiniciada por removeLicense(); um logout normal nunca lhe toca.
    _licensedOrganizationId = data.data.organization_id ?? null;

    // Fase 11B.12 — activar a licença já não autentica ninguém nem emite
    // tokens (licença = direito da Organization, não sessão humana). A
    // identidade real vem sempre de /api/auth/login (Fase 11B.8) — nada
    // a fazer aqui além de confirmar a licença e mostrar os metadados.
    return {
      isValid:     true,
      mode:        'connected',
      clientName:  data.data.organization,
      expiryDate:  data.data.license?.expiryDate ? new Date(data.data.license.expiryDate) : undefined,
      maxUsers:    data.data.license?.maxUsers,
      features:    data.data.license?.features,
      licenseType: data.data.license?.licenseType,
    };
  } catch (err) {
    const axiosErr = err as AxiosError<{ message?: string; code?: string }>;
    const code     = axiosErr.response?.data?.code;
    const message  = axiosErr.response?.data?.message;

    if (!axiosErr.response) {
      return { isValid: false, error: 'API inacessível. Verifica a ligação e tenta novamente.' };
    }
    if (code === 'DISPLAY_KEY_NOT_REGISTERED') {
      return { isValid: false, error: 'Chave não encontrada no servidor. Contacta o suporte técnico.' };
    }
    if (code === 'REVOKED') {
      return { isValid: false, error: 'Esta licença foi revogada.' };
    }
    if (code === 'EXPIRED') {
      toast.error('Licença expirada', {
        description: 'Renova a tua licença contactando o suporte técnico.',
        duration: 8000,
      });
      return { isValid: false, error: message || 'Licença expirada.' };
    }
    return { isValid: false, error: message || 'Erro ao validar a chave com o servidor.' };
  }
}

// Fase 11B.12 — só confirma que a licença ainda é válida no servidor (e
// mantém desktop_activations actualizado como metadado). Já não estabelece
// nenhuma sessão — connected activation deixou de emitir tokens; a única
// forma de obter uma sessão real é /api/auth/login (Fase 11B.8). Chamado
// pelo fluxo de validação da chave e pelo fallback de tryRefreshOrReactivate()
// quando não há refresh_token nenhum para tentar renovar.
// Achado real (2026-09-08): devolvia sempre void — o único caller que
// importava (tryRefreshOrReactivate, no arranque da app, sem refresh_token
// nenhum ainda) não tinha forma de saber se isto falhou por um motivo
// transitório (API/rede ainda não prontas — muito comum mesmo no arranque:
// o container self-hosted pode levar mais alguns segundos que a própria
// app Electron) ou por uma recusa real (chave inválida/revogada). 'transient'
// é o único caso que vale a pena reagendar automaticamente — ver
// tryRefreshOrReactivate() abaixo.
async function activateOnApi(licenseKey: string): Promise<'ok' | 'transient' | 'rejected'> {
  try {
    const { data } = await apiClient.post('/api/auth/activate', {
      license_key: licenseKey,
      machine_id:  getMachineId(),
    });
    // Mesmo achado de validateDisplayKey() acima — reactivação em segundo
    // plano (ex. arranque da app) também confirma qual Organization está
    // licenciada, não só a activação inicial por chave.
    if (data?.data?.organization_id) _licensedOrganizationId = data.data.organization_id;
    return 'ok';
  } catch (err) {
    const axiosErr = err as AxiosError<{ message?: string; code?: string }>;
    const code     = axiosErr.response?.data?.code;
    const message  = axiosErr.response?.data?.message;

    if (code === 'DISPLAY_KEY_NOT_REGISTERED') {
      console.warn('[License] Chave curta não registada na API — usa a chave FULL');
      return 'rejected';
    }
    if (!axiosErr.response) {
      console.warn('[License] API inacessível — modo offline');
      return 'transient';
    }
    console.error('[License] Activação falhou:', message);
    // 5xx é o servidor a falhar (ex. a ligar-se à sua própria BD), não uma
    // decisão de negócio sobre a licença — mesmo tratamento que o ramo de
    // refresh já dá a um 5xx.
    return axiosErr.response.status >= 500 ? 'transient' : 'rejected';
  }
}

// Achado real (2026-09-12): num arranque a frio com sessão local já
// persistida, AuthContext.tsx (tryRestoreCachedSession, fire-and-forget) e
// LicenseContext.tsx (checkExistingLicense, aguardado) montam ao mesmo
// tempo e chamavam ESTA função em paralelo, ambos com o MESMO
// _refreshToken — dois POST /api/auth/refresh concorrentes para a mesma
// sessão. Consoante a ordem em que as respostas chegavam, o pedido que
// resolvia por último podia limpar um _accessToken que o outro pedido
// tinha acabado de estabelecer com sucesso — reprodutível de forma
// praticamente determinística em TODOS os arranques a frio, só resolvido
// manualmente com logout+login (caminho de chamada única). O guard
// anterior (_reconnectRefreshInFlight) só cobria o listener 'online' —
// não este par. Movido para dentro da própria função: todas as chamadas
// (listener 'online', tryRestoreCachedSession, checkExistingLicense, e os
// timers de scheduleRefresh/scheduleRetryAfterFailure) partilham agora a
// MESMA promise em curso, nunca disparam pedidos paralelos.
let _refreshInFlight: Promise<void> | null = null;

async function tryRefreshOrReactivate(): Promise<void> {
  if (_refreshInFlight) return _refreshInFlight;
  _refreshInFlight = tryRefreshOrReactivateImpl().finally(() => { _refreshInFlight = null; });
  return _refreshInFlight;
}

async function tryRefreshOrReactivateImpl(): Promise<void> {
  // Achado real (2026-09-08): sem isto, uma falha transitória aqui (5xx/sem
  // resposta — ex. um blip de ligação da API self-hosted ao Neon) nunca
  // reagendava outra tentativa. activateOnApi() (chamado mais abaixo, como
  // fallback) engole os seus próprios erros e devolve void, por isso nem
  // sequer um erro visível — só silêncio. scheduleRefresh() só é chamado no
  // ramo de SUCESSO; se refresh E a reactivação por licença falharem os
  // dois, _refreshTimer nunca mais dispara, e a sessão (e tudo o que
  // depende de um access_token válido — devices/positions/geofences do
  // Traccar, o token do PowerSync) fica presa num 401 permanente até a app
  // ser reiniciada manualmente. Só true quando havia mesmo uma sessão a
  // tentar renovar (nunca no arranque sem sessão nenhuma — checkExistingLicense
  // chama isto uma vez só, antes do login, propositadamente sem retry).
  let retryOnFailure = false;

  if (_refreshToken) {
    try {
      const { data } = await apiClient.post('/api/auth/refresh', {
        refresh_token: _refreshToken,
      });
      if (data.success) {
        _accessToken = data.data.access_token;
        await window._service_auth.setToken(data.data.access_token);
        scheduleRefresh(data.data.expires_in);
        window.dispatchEvent(new Event(SESSION_TOKEN_READY_EVENT));
        return;
      }
    } catch (err) {
      const axiosErr = err as AxiosError<{ code?: string }>;

      // Achado real (2026-09-05): sem internet, mas com a API self-hosted
      // acessível na LAN, um refresh em segundo plano ainda recebe uma
      // resposta HTTP — só que um 500 genuíno (AuthUseCase.refreshAccessToken
      // falha a ligar ao Neon), não uma recusa deliberada da sessão. Tratar
      // qualquer `axiosErr.response` como "revogado" apagava a cache
      // (clearApiSession()) exactamente na situação em que ela mais falta
      // fazia — a app ficava sem sessão cacheada nenhuma na próxima vez que
      // precisasse dela offline. Só um 4xx é uma decisão de negócio real
      // sobre esta sessão (REFRESH_EXPIRED/SESSION_REVOKED/etc.); um 5xx
      // vale como "sem ligação", tal como a ausência de resposta.
      //
      // Achado real (2026-09-12): "ao voltar a ficar online, fica preso em
      // 'Sem sessão activa no servidor' em vez de reconectar" — QUALQUER 4xx
      // (não só REFRESH_EXPIRED/SESSION_REVOKED) caía neste ramo e apagava a
      // sessão de vez, sem agendar retry nenhum. `authRateLimit.ts` devolve
      // 429 (<500) em rajadas de pedidos — e o listener 'online' (mais
      // abaixo) não tinha guarda contra chamadas concorrentes: o evento
      // 'online' do Electron/Chromium é conhecido por disparar em rajada ao
      // reconectar, cada disparo chamando tryRefreshOrReactivate() em
      // paralelo, plausivelmente rebentando o rate limit. Um 429 (ou
      // qualquer 4xx que não seja mesmo uma recusa da SESSÃO) nunca deveria
      // apagar tokens válidos — só os dois códigos que a API emite para uma
      // recusa deliberada desta sessão específica contam como revogação
      // real; qualquer outro 4xx (429, ou um futuro código não prometido
      // pelo contrato) cai para o mesmo tratamento "sem ligação"/transitório
      // do 5xx logo abaixo, com retry agendado.
      const code = axiosErr.response?.data?.code;
      const isDeliberateRevocation =
        axiosErr.response && (code === 'REFRESH_EXPIRED' || code === 'SESSION_REVOKED');

      if (isDeliberateRevocation) {
        // Fase 11B.11 (estado 6 — "sessão revogada remotamente") — o
        // servidor RESPONDEU e recusou explicitamente esta sessão; não é
        // falta de ligação. Nunca cair para activateOnApi() aqui: isso
        // reactivaria como o admin sintético da licença, mascarando a
        // recusa real com uma identidade diferente — exactamente o
        // problema que as Fases 11B.8-11B.10 eliminaram. Limpa tudo (tokens
        // + cache) e força um login explícito.
        await handleSessionRevoked(code as 'REFRESH_EXPIRED' | 'SESSION_REVOKED');
        return;
      }

      // Sem resposta, resposta com 5xx, ou um 4xx que não é mesmo uma
      // recusa desta sessão (ex. 429 do rate limit) — genuinamente sem
      // ligação, o servidor a falhar por não conseguir alcançar a sua
      // própria BD, ou um blip transitório, nunca uma recusa deliberada.
      // Mantém os tokens/cache actuais (continuam válidos localmente) e
      // tenta a reactivação por licença como último recurso — falha
      // silenciosamente se também não houver ligação (activateOnApi já
      // trata isso). Reagenda mais abaixo mesmo que este fallback também
      // falhe — ver comentário no topo da função.
      console.warn('[License] Refresh falhou (sem ligação/transitório):', safeErr(err));
      retryOnFailure = true;
    }
  }

  const rawKey: string | null = await window.license.getRawLicense();
  if (rawKey) {
    // Achado real (2026-09-08): esta chamada é TAMBÉM o único caminho no
    // arranque da app (checkExistingLicense, sem _refreshToken nenhum
    // ainda) — "modo offline" aqui não significava só "sem licença", podia
    // ser só a API/rede ainda não estarem prontas no exacto milissegundo em
    // que a app arrancou (self-hosted: o container pode continuar a
    // inicializar por mais alguns segundos). Sem retry, a app ficava
    // "offline" para o resto da sessão mesmo que a API respondesse
    // perfeitamente segundos depois — exactamente o "às vezes fica offline
    // mesmo com o servidor ligado" reportado.
    const outcome = await activateOnApi(rawKey);
    if (outcome === 'transient') retryOnFailure = true;
  }
  if (retryOnFailure) scheduleRetryAfterFailure();
}

function scheduleRefresh(expiresInSeconds: number): void {
  if (_refreshTimer) clearTimeout(_refreshTimer);
  const ms = Math.max((expiresInSeconds - 300) * 1000, 60_000);
  _refreshTimer = setTimeout(tryRefreshOrReactivate, ms);
}

function scheduleRetryAfterFailure(): void {
  if (_refreshTimer) clearTimeout(_refreshTimer);
  _refreshTimer = setTimeout(tryRefreshOrReactivate, 60_000);
}

// Fase 11B.11 — "quando voltar a estar online: validar/renovar sessão".
// Sem isto, uma reconexão só era detectada no próximo tick agendado de
// scheduleRefresh (até ~7h55 de distância) ou na próxima acção explícita do
// utilizador. Seguro chamar sempre: sem _refreshToken e sem licença guardada,
// tryRefreshOrReactivate() já é um no-op.
//
// Achado real (2026-09-12): o evento 'online' do Electron/Chromium é
// conhecido por disparar em rajada (vários eventos seguidos) ao reconectar.
// Não precisa de guarda própria aqui — tryRefreshOrReactivate() já
// deduplica internamente (_refreshInFlight, ver acima) qualquer chamada
// concorrente, de qualquer origem, não só desta.
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void tryRefreshOrReactivate();
  });
}

// ── Estado combinado online/offline × sessão (Fase 11B.11) ──────────────────
// Classifica em qual dos estados 1-5/8 o Desktop está agora, para a UI poder
// ser honesta sobre o que está realmente a acontecer — nunca dar a entender
// que uma Role/Scope foi validada localmente quando só existe um cache. O
// estado 6 (sessão revogada) é um EVENTO (SESSION_REVOKED_EVENT acima), não
// um estado persistente aqui — depois de tratado, a app volta ao ecrã de
// login. O estado 7 (licença expirada) já é tratado pelo LicenseGuard
// existente (gate anterior a este, substitui a app inteira pelo diálogo de
// activação) — não é reclassificado aqui.
export type DesktopSessionState =
  | 'online-valid'
  | 'online-expired'
  | 'offline-cache-valid'
  | 'offline-cache-expired'
  | 'offline-no-cache'
  | 'no-session';

export interface DesktopSessionInfo {
  state:    DesktopSessionState;
  isOnline: boolean;
}

// Achado real (2026-09-0X): utilizador via "Offline" com a API a correr
// localmente via WSL, sem ligação à Internet. Causa: `navigator.onLine`
// reflecte se a OS tem rota para a Internet, não se o servidor configurado
// está acessível — para um servidor loopback isso é irrelevante (nunca
// precisou de internet para ser alcançado). O mesmo sinal engana também o
// engine.io-client usado por useApiConnection.ts (ver normalizeSocketUrl
// abaixo, e o comentário lá com a linha exacta da lib). Exportado para os
// dois sítios partilharem a mesma noção de "isto é local".
export function isLoopbackHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
}

// engine.io-client (o motor por trás do Socket.io) força o fecho da ligação
// sempre que o browser dispara o evento global 'offline' — EXCEPTO quando o
// hostname da ligação é literalmente a string "localhost" (comparação de
// string exacta, ver node_modules/engine.io-client/build/esm/socket.js,
// `if (this.hostname !== "localhost")`). Configurar o servidor como
// "127.0.0.1" (equivalente em termos de rede, mas uma string diferente)
// não activa esta excepção — por isso normalizamos aqui antes de qualquer
// `io(url, ...)`, em vez de depender de qual valor exacto foi guardado nas
// definições.
export function normalizeSocketUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (isLoopbackHostname(parsed.hostname)) {
      parsed.hostname = 'localhost';
      return parsed.toString().replace(/\/$/, '');
    }
    return url;
  } catch {
    return url;
  }
}

// Correcção de uma correcção anterior (mesmo dia): a primeira tentativa
// tratava "hostname loopback" como "está sempre acessível", presumindo que
// uma rota loopback nunca falha — verdade para a ROTA, falso para o
// SERVIDOR: se o processo da API estiver mesmo desligado (utilizador testou
// isto explicitamente, infra toda desligada), não há nada a responder em
// 127.0.0.1:PORT, e fingir "online" prendia a app no estado 'no-session'
// para sempre (nunca cai para offline-cache-*, mesmo com uma sessão
// cacheada válida à espera de ser usada). A única forma correcta de saber
// se o servidor está mesmo a responder é perguntar-lhe — sem isto,
// `navigator.onLine`/hostname nunca substituem uma verificação real.
async function probeApiReachable(timeoutMs = 3000): Promise<boolean> {
  try {
    await apiClient.get('/health', { timeout: timeoutMs });
    return true;
  } catch (err) {
    const axiosErr = err as AxiosError;
    // O servidor respondeu (mesmo com erro) — está acessível; só a
    // ausência de qualquer resposta significa "inalcançável".
    return !!axiosErr.response;
  }
}

export async function getDesktopSessionState(): Promise<DesktopSessionInfo> {
  const isOnline = await probeApiReachable();
  const accessExpiresAt = _accessToken ? decodeJwtExpiry(_accessToken) : null;
  const hasLiveAccessToken = !!accessExpiresAt && accessExpiresAt > Date.now();

  if (isOnline) {
    if (hasLiveAccessToken) return { state: 'online-valid', isOnline };
    if (_accessToken) return { state: 'online-expired', isOnline };
    // Estado 8 do prompt original — mas achado real (2026-09-05): quem
    // consome este estado (SessionStatusLabel, em BaseLayout.tsx) só é
    // montado depois de isAuthenticated já ser true (ver App.tsx:
    // `if (!isAuthenticated) return <LoginPage/>`) — nunca antes.
    // Nunca interpretar este estado como "ainda não fez login": o utilizador
    // já está autenticado localmente; só falta uma sessão live/em cache com
    // o servidor (`navigator.onLine` reporta true mesmo sem WAN real, ex.
    // API self-hosted acessível só por LAN — não confundir com "não há
    // sessão nenhuma"). A mensagem mostrada (noSessionOnlineTitle/
    // Description) reflecte isto — nunca "inicia sessão" a quem já entrou.
    return { state: 'no-session', isOnline };
  }

  if (hasLiveAccessToken) return { state: 'offline-cache-valid', isOnline };

  try {
    const cached = await window._service_auth.getCachedSession();
    if (!cached) return { state: 'offline-no-cache', isOnline };

    const cacheExpiresAt = decodeJwtExpiry(cached.refresh_token);
    if (cacheExpiresAt && cacheExpiresAt > Date.now()) {
      return { state: 'offline-cache-valid', isOnline };
    }
    return { state: 'offline-cache-expired', isOnline };
  } catch {
    return { state: 'offline-no-cache', isOnline };
  }
}
