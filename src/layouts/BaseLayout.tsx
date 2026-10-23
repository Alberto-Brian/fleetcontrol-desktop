import React from "react";
import DragWindowRegion from "@/components/DragWindowRegion";
import { useLicense }       from "@/hooks/useLicense";
import { useTracking }      from "@/contexts/TrackingContext";
import { useHistoricalDb }  from "@/contexts/HistoricalDbContext";
import { useDesktopSessionState } from "@/hooks/useDesktopSessionState";
import { useTranslation }   from "react-i18next";
import { Wifi, WifiOff, AlertCircle, Loader2, Archive, X } from "lucide-react";
import type { DesktopSessionState } from "@/helpers/license-helpers";

// ─── Estado da sessão (só quando há algo a assinalar) — texto pequeno,
// mesmo tamanho/peso do estado de ligação ao lado, com o detalhe completo
// disponível ao passar o rato (não ocupa espaço permanente no ecrã, ao
// contrário do banner de largura total que isto substitui).
const SESSION_LABEL_KEY: Partial<Record<DesktopSessionState, { titleKey: string; descriptionKey: string; color: string }>> = {
    'offline-cache-valid':   { titleKey: 'auth:session.badge.offlineCacheValidTitle',   descriptionKey: 'auth:session.badge.offlineCacheValidDescription',   color: '#fbbf24' },
    'offline-cache-expired': { titleKey: 'auth:session.badge.offlineCacheExpiredTitle', descriptionKey: 'auth:session.badge.offlineCacheExpiredDescription', color: '#f87171' },
    'offline-no-cache':      { titleKey: 'auth:session.badge.noSessionOfflineTitle',    descriptionKey: 'auth:session.badge.noSessionOfflineDescription',    color: '#f87171' },
    'no-session':            { titleKey: 'auth:session.badge.noSessionOnlineTitle',     descriptionKey: 'auth:session.badge.noSessionOnlineDescription',     color: '#fbbf24' },
};

function SessionStatusLabel() {
    const { t } = useTranslation();
    const { state } = useDesktopSessionState();
    const config = SESSION_LABEL_KEY[state];
    if (!config) return null;

    return (
        <span
            title={t(config.descriptionKey)}
            style={{ fontSize: 11, fontWeight: 600, color: config.color, cursor: 'help' }}
        >
            {t(config.titleKey)}
        </span>
    );
}

// CSS dos pontinhos — mesmo padrão de injecção única já usado em
// TrackingMap.tsx (fc-heartbeat). Só opacidade a piscar (sem escala/
// deslocação) — cada ponto atrasado em relação ao anterior, para ler como
// "· · ●" a percorrer a fila, tipo loading clássico de reticências.
const SYNC_DOTS_STYLE_ID = 'fc-sync-dots-style';
function ensureSyncDotsStyle() {
    if (document.getElementById(SYNC_DOTS_STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = SYNC_DOTS_STYLE_ID;

    style.textContent = `
      @keyframes fc-sync-dot-loading {
        0%, 60%, 100% {
          opacity: 0.25;
        }

        30% {
          opacity: 1;
        }
      }

      .fc-sync-dot {
        animation: fc-sync-dot-loading 1.4s ease-in-out infinite;
      }

      .fc-sync-dot:nth-child(2) {
        animation-delay: 0.2s;
      }

      .fc-sync-dot:nth-child(3) {
        animation-delay: 0.4s;
      }
    `;

    document.head.appendChild(style);
}

const SYNC_MIN_VISIBLE_MS = 3200; // tempo pedido pelo utilizador — o anterior (900ms) era pouco
const SYNC_FADE_MS = 250;
const SYNC_DOT_COLOR = '#10a37f'; // amarelo, pedido explícito do utilizador
// ─── Três pontinhos, só visíveis enquanto o PowerSync está mesmo a
// enviar/receber (push em tempo real, não polling) — pedido explícito do
// utilizador para dar sinal visual de sincronização a acontecer, sem
// ocupar espaço quando não há nada a sincronizar. Entra/sai com fade (não
// aparece/desaparece abruptamente) e fica visível pelo menos
// SYNC_MIN_VISIBLE_MS, mesmo que a sincronização em si já tenha terminado
// — sem isto, uma sync de uma única linha (ex. um veículo) era rápida
// demais para o olho humano perceber os pontinhos a aparecer.
function PowerSyncActivityDots({ onVisibilityChange }: { onVisibilityChange?: (shown: boolean) => void }) {
    const [shown, setShown] = React.useState(false);
    const [faded, setFaded] = React.useState(false);
    const shownAtRef = React.useRef(0);
    const hideTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const unmountTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    // O alerta Traccar (TraccarAlertFlash, logo abaixo) dá prioridade a este
    // indicador — nunca mostra o flash de alerta por cima de uma sync a
    // decorrer. Reporta a visibilidade ao pai para essa decisão sem os dois
    // componentes precisarem de se conhecer directamente.
    React.useEffect(() => { onVisibilityChange?.(shown); }, [shown, onVisibilityChange]);

    React.useEffect(() => {
        ensureSyncDotsStyle();
        return window._service_powersync.onStatusChanged((status) => {
            const active = status.uploading || status.downloading;
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
            if (unmountTimerRef.current) clearTimeout(unmountTimerRef.current);

            if (active) {
                setShown((wasShown) => {
                    if (!wasShown) shownAtRef.current = Date.now();
                    return true;
                });
                // requestAnimationFrame garante que o browser já pintou
                // opacity:0 antes de mudar para 1 — sem isto a transição
                // não anima, o elemento aparece já visível.
                requestAnimationFrame(() => setFaded(true));
                return;
            }

            const elapsed = Date.now() - shownAtRef.current;
            const remaining = Math.max(SYNC_MIN_VISIBLE_MS - elapsed, 0);
            hideTimerRef.current = setTimeout(() => {
                setFaded(false);
                unmountTimerRef.current = setTimeout(() => setShown(false), SYNC_FADE_MS);
            }, remaining);
        });
    }, []);

    if (!shown) return null;

    return (
        <div
            className="flex items-center gap-1"
            style={{ opacity: faded ? 1 : 0, transition: `opacity ${SYNC_FADE_MS}ms ease` }}
            title="A sincronizar dados..."
        >
            {[0, 1, 2].map((i) => (
                <span
                    key={i}
                    className="fc-sync-dot"
                    style={{ width: 4, height: 4, borderRadius: '50%', background: SYNC_DOT_COLOR, animationDelay: `${i * 0.25}s` }}
                />
            ))}
        </div>
    );
}

const ALERT_FLASH_MS = 1400; // curto de propósito — um "flash", não uma barra persistente
const ALERT_FLASH_COLOR = '#60a5fa'; // mesmo azul do botão de menu seleccionado (--nav-active-color, styles/global.css)

// ─── Três pontinhos na titlebar quando chega um alerta Traccar (geofence/
// velocidade/ignição) — pedido explícito do utilizador: mesmos três
// pontinhos e mesma animação do PowerSyncActivityDots acima, só a cor
// muda (azul, igual ao botão de menu seleccionado — --nav-active-color)
// para se distinguir à vista. Um alerta pode disparar várias vezes por minuto (confirmado com
// o simulador) — por isso é um flash curto que acende e apaga a cada
// alerta novo, nunca uma barra que fica ligada. Cede sempre ao
// PowerSyncActivityDots: se a sync estiver visível no momento em que
// chega um alerta, o flash não aparece por cima — pedido explícito do
// utilizador ("priorizar o loading do sync").
function TraccarAlertFlash({ suppressed }: { suppressed: boolean }) {
    const { state } = useTracking();
    const [shown, setShown] = React.useState(false);
    const lastAlertIdRef = React.useRef<string | number | null>(null);
    const hideTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const firstRunRef = React.useRef(true);

    React.useEffect(() => { ensureSyncDotsStyle(); }, []);

    React.useEffect(() => {
        const latest = state.alerts[0];
        if (!latest) return;

        // Não disparar no primeiro render (alertas já existentes ao montar,
        // ex. após reabrir a app) — só alertas que chegam a partir de agora.
        if (firstRunRef.current) {
            firstRunRef.current = false;
            lastAlertIdRef.current = latest.id;
            return;
        }
        if (latest.id === lastAlertIdRef.current) return;
        lastAlertIdRef.current = latest.id;

        if (suppressed) return; // sync tem prioridade — este alerta fica sem flash

        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        setShown(true);
        hideTimerRef.current = setTimeout(() => setShown(false), ALERT_FLASH_MS);
    }, [state.alerts, suppressed]);

    if (!shown) return null;

    // Mesmos três pontinhos/animação do PowerSyncActivityDots
    // (fc-sync-dot, já injectada por ensureSyncDotsStyle) — só a cor muda.
    return (
        <div className="flex items-center gap-1" title="Novo alerta Traccar">
            {[0, 1, 2].map((i) => (
                <span
                    key={i}
                    className="fc-sync-dot"
                    style={{ width: 4, height: 4, borderRadius: '50%', background: ALERT_FLASH_COLOR, animationDelay: `${i * 0.25}s` }}
                />
            ))}
        </div>
    );
}

// ─── Badge de estado da ligação (lado direito da titlebar) ───────────────────
function ConnectionStatusBadge() {
    const { connState, traccarStatus } = useTracking();
    const [syncShown, setSyncShown] = React.useState(false);

    const isOnline        = connState === 'connected' && traccarStatus?.connected;
    const isApiOnly       = connState === 'connected' && !traccarStatus?.connected;
    const isConnecting    = connState === 'connecting';
    const isReconnecting  = connState === 'reconnecting';
    const isError         = connState === 'error';
    const isOffline       = !isOnline && !isApiOnly && !isConnecting && !isReconnecting && !isError;

    return (
        <div className="flex items-center gap-3 select-none">
            <SessionStatusLabel />
            <PowerSyncActivityDots onVisibilityChange={setSyncShown} />
            <TraccarAlertFlash suppressed={syncShown} />
            <div className="flex items-center gap-1.5">
                {isOnline && (
                    <>
                      <Wifi style={{ width: 11, height: 11, color: '#4ade80' }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#4ade80' }}>Online</span>
                    </>
                )}
                {isApiOnly && (
                    <>
                      <AlertCircle style={{ width: 11, height: 11, color: '#fbbf24' }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#fbbf24' }}>Traccar offline</span>
                    </>
                )}
                {isConnecting && (
                    <>
                      <Loader2 style={{ width: 11, height: 11, color: '#60a5fa' }} className="animate-spin" />
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#60a5fa' }}>A ligar...</span>
                    </>
                )}
                {isReconnecting && (
                    <>
                      <Loader2 style={{ width: 11, height: 11, color: '#fbbf24' }} className="animate-spin" />
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#fbbf24' }}>A reconectar...</span>
                    </>
                )}
                {isError && (
                    <>
                      <AlertCircle style={{ width: 11, height: 11, color: '#f87171' }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#f87171' }}>Servidor inacessível</span>
                    </>
                )}
                {isOffline && (
                    <>
                      <WifiOff style={{ width: 11, height: 11, color: '#94a3b8' }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>Offline</span>
                    </>
                )}
            </div>
        </div>
    );
}

// ─── Layout base ─────────────────────────────────────────────────────────────
export default function BaseLayout({ children }: { children: React.ReactNode }) {
    const { license } = useLicense();
    const { historicalDbPath, historicalDbName, deactivate } = useHistoricalDb();

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <DragWindowRegion
                title=""
                rightContent={license ? <ConnectionStatusBadge /> : undefined}
            />
            {historicalDbPath && (
                <div className="flex items-center justify-between gap-3 px-4 py-1.5 bg-amber-500 text-amber-950 text-xs font-medium shrink-0 z-50">
                    <div className="flex items-center gap-2 min-w-0">
                        <Archive className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                            Modo histórico activo: <strong>{historicalDbName}</strong> — dados somente leitura
                        </span>
                    </div>
                    <button
                        onClick={deactivate}
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-700/25 hover:bg-amber-700/45 transition-colors shrink-0"
                    >
                        <X className="w-3 h-3" />
                        Desactivar
                    </button>
                </div>
            )}
            <main className="flex-1 overflow-hidden">{children}</main>
        </div>
    );
}
