# FleetControl Desktop

Aplicação Electron (React) de gestão operacional de frotas. Funciona ligada à
`fleetcontrol-api` e continua a funcionar sem rede: os dados operacionais vivem
numa base local (`powersync.db`) que sincroniza com o servidor via PowerSync.

## Pré-requisitos

- **Node.js 20** (ver `.nvmrc`; com nvm: `nvm use`)
- npm (vem com o Node)
- Windows: ferramentas de compilação C++ para recompilar o `better-sqlite3`
  (normalmente já vêm com o Node; se o `postinstall` falhar, instalar as
  "Desktop development with C++" do Visual Studio Build Tools)

## Instalar as dependências

Usar **sempre** este comando — o `npm install` simples falha neste projecto:

```bash
npm install --legacy-peer-deps --fetch-retries=6 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=180000 --fetch-timeout=900000
```

Porquê cada opção:

- `--legacy-peer-deps` — conflito antigo e inofensivo entre
  `react-leaflet-cluster` (pede `@react-leaflet/core@3`) e `react-leaflet@4`
  (traz o `@react-leaflet/core@2`). Sem esta opção o npm recusa instalar.
- `--fetch-retries` / `--fetch-retry-*` / `--fetch-timeout` — em redes
  instáveis (`ECONNRESET`, timeouts) o npm desiste a meio de pacotes grandes
  (Electron, binários nativos). Com isto volta a tentar em vez de falhar.

Se a cache do npm já estiver cheia de uma instalação anterior, acrescentar
`--prefer-offline` acelera bastante.

No fim corre sozinho o `postinstall` (`npm run rebuild`), que recompila o
`better-sqlite3` para a versão do Electron. Se este passo falhar, corrigir a
causa e correr `npm run rebuild` à parte.

### Se a instalação for interrompida

**Nunca interromper um `npm install` a meio** (Ctrl+C, fechar o terminal,
falta de rede prolongada): deixa pacotes truncados em `node_modules` que a
instalação seguinte não substitui, e a app falha depois com erros estranhos
(módulos em falta, `electron-forge` não encontrado, `package.json` vazio).

Se acontecer, limpar e instalar de novo:

1. Fechar o VS Code e qualquer terminal com a app aberta (no Windows os
   ficheiros ficam bloqueados e não se deixam apagar).
2. Apagar a pasta `node_modules` (o `package-lock.json` fica).
3. Confirmar que o `package.json` não ficou vazio — se ficou,
   `git restore package.json`.
4. Correr de novo o comando de instalação acima.

## Configurar

Criar um ficheiro `.env` na raiz (não vai para o git) com o endereço da API,
**sem porta e sem `/api`** (o código acrescenta-o):

```env
VITE_API_URL=https://app.fleetcontrol.systems
API_URL=https://app.fleetcontrol.systems
```

## Correr

```bash
npm start
```

## Gerar o instalador

```bash
npm run make
```
