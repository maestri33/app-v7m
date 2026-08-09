<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# app-v7m — app do promotor

Next.js **16.2.9**, App Router, Turbopack, `output: "standalone"`. Frontend role-gated do lado
interno da V7M: **candidato → promotor → coordenador**. Consome o backend Django + Ninja pelos
grupos `/api/v1/collaborators/` e `/api/v1/leadership/`.

Não é o app do cliente final (lead → enrollment → student → veteran) — esse é o `app-supletivo`,
publicado em `app.supletivo.net.br`. Não é o backend — esse é o repositório
[`maestri33/backend-supletivo`](https://github.com/maestri33/backend-supletivo), consumido só por
HTTP.

O `CLAUDE.md` importa este arquivo (`@AGENTS.md`) e acrescenta vocabulário, produto e roadmap. O que
vale para **qualquer** agente (Claude Code, Codex, Cursor, Copilot) fica aqui.

---

## 1. Antes de escrever código, leia a fonte certa

Não responda de memória sobre Next.js: a 16.x mudou API, convenção e estrutura de arquivo em relação
ao que a maioria dos modelos viu no treino. A doc **da versão instalada** vem empacotada no pacote.

| Dúvida | Onde ler |
|---|---|
| API, convenção ou arquivo do Next.js | `node_modules/next/dist/docs/` — casa com a 16.2.9 instalada |
| Mensagem de erro do Next | `https://nextjs.org/docs/messages/<slug>.md` — não vem empacotada |
| Como o app conversa com a API | `backend-supletivo` → [`wiki/frontend-integracao.md`](https://github.com/maestri33/backend-supletivo/blob/main/wiki/frontend-integracao.md) |
| O que mudou no backend | `backend-supletivo` → [`wiki/frontend-changes.md`](https://github.com/maestri33/backend-supletivo/blob/main/wiki/frontend-changes.md) |
| Fluxo de um grupo da API | `backend-supletivo` → [`docs/api/collaborators.md`](https://github.com/maestri33/backend-supletivo/blob/main/docs/api/collaborators.md), [`docs/api/leadership.md`](https://github.com/maestri33/backend-supletivo/blob/main/docs/api/leadership.md) |
| Schema exato de um endpoint | OpenAPI vivo: `$BACKEND_URL/api/v1/<grupo>/openapi.json` |

O backend é **outro repositório**, não um diretório deste. Caminhos como `~/mvp/backend/` ou
`/root/app-supletivo`, que aparecem em documentos antigos, são da máquina do Victor e não resolvem em
uma sessão limpa — use os links acima.

Comece pelo índice: `node_modules/next/dist/docs/index.md`.

---

## 2. Loop de verificação

O gate local é o mesmo do CI (`.github/workflows/ci.yml`). Rode nesta ordem antes de considerar
qualquer mudança pronta:

```bash
npm ci
npx tsc --noEmit     # typecheck
npm run lint
npm run build        # standalone
npm run test:e2e     # Playwright — precisa de: npx playwright install --with-deps chromium
```

Durante o desenvolvimento, trabalhe contra o `npm run dev` em vez de adivinhar:

- Erro de runtime e warning do console do browser são encaminhados para o terminal
  (`logging.browserToTerminal` em `next.config.ts`) — é assim que você enxerga uma falha de client
  component sem abrir o DevTools.
- Erros de build, de runtime e de tipo saem pelo MCP (§5) com `get_errors`, sem precisar de um
  `next build` inteiro.
- `npm run shot` (`scripts/shot.mjs`) é o harness de screenshot para conferência visual.

Se um erro do Next trouxer link `Learn more`, abra a página antes de escolher a correção — cada uma
tem trade-off diferente e a página descreve os três caminhos.

---

## 3. Contrato com o backend

Fonte da verdade: `api/base.py` do backend e `wiki/frontend-integracao.md`. O que mais gera bug aqui:

- **Envelope de erro.** Todo 4xx/5xx do Django é `{detail, code, ...extra}`. Roteie por
  `switch(code)` — **nunca** parseie `detail`, que é texto para humano e muda sem aviso.
  `src/lib/api/client.ts` já expõe `DjangoError` (com `.code` e `.extra`) e `getErrorMessage()`;
  use-os em vez de reimplementar.
- **`external_id` (UUID) é o identificador público.** O backend nunca expõe PK — não invente uma.
- **Auth é por cookie HttpOnly, não por token no client.** O par `v7m_access` (15 min) / `v7m_refresh`
  (14 d) é gravado pelos route handlers em `src/app/api/auth/*`; o browser nunca vê o JWT. Decisão
  de 2026-06-23, tomada porque o coordenador tem poder administrativo e o token não pode ficar
  exposto a XSS. **Não** introduza rewrite `/api/*` nem token client-side (o `app-supletivo` faz
  diferente de propósito; não copie de lá).
- **Chamada ao Django é server-side.** `djangoFetch()` é `server-only` e lê o cookie. Componentes de
  client falam com os route handlers do próprio Next, nunca direto com o backend — é por isso que a
  CSP em `next.config.ts` consegue ser `connect-src 'self'`.
- **Roles são acumulativas** e vêm todas no JWT. `src/lib/auth/roles.ts` as separa em três eixos:
  `stage` (candidate → promoter), `gate` (`training`, que tranca tudo no LMS enquanto existir) e
  `grant` (`coordinator`/`staff`, aditivos). Quando a role muda, o `token_version` sobe e o token
  antigo cai.
- **`BACKEND_URL` é server-side e o único env que muda entre ambientes.** Nunca hardcode a base da
  API; nunca commite `.env` (só `.env.example`).

---

## 4. Convenções deste repositório

- Casca em `src/`, alias `@/*` → `./src/*`.
- Componentes em `src/components/ui/` usam **kebab-case** no nome do arquivo.
- Identificadores em **inglês**; texto voltado a pessoa em **pt-BR**. Sem exceção.
- Tokens de cor `--color-brand-*` (dourado/preto/prata — não é bandeira do Brasil). Fonte Geist.
- CSP e headers de segurança vivem em `next.config.ts`. Ao adicionar origem externa, ajuste a CSP no
  mesmo commit, senão quebra só em produção.
- Service worker conservador: cacheia `/_next/static/`, **nunca** `/api/*` nem HTML autenticado.
- Não crie arquivo que não foi pedido — sem README por módulo, sem RUNBOOK, sem stack de
  observabilidade.

---

## 5. MCP

O dev server expõe um endpoint MCP em `/_next/mcp`. O jeito suportado de falar com ele nesta versão
é pelo pacote `next-devtools-mcp`, que descobre a instância rodando sozinho — está configurado em
`.mcp.json` na raiz, então qualquer sessão aberta neste repositório já enxerga as ferramentas.

Ferramentas disponíveis: `get_errors`, `get_logs`, `get_page_metadata`, `get_project_metadata`,
`get_routes`, `get_server_action_by_id`.

Fluxo: suba o `npm run dev`, abra a página no browser, e consulte o agente. Detalhes em
`node_modules/next/dist/docs/01-app/02-guides/mcp.md`.

---

## 6. Armadilhas conhecidas

- **`.agents/skills/app-v7m/SKILL.md` é gerado automaticamente e está errado** em pelo menos um
  ponto: manda usar camelCase em nome de arquivo, enquanto a convenção real de `components/ui/` é
  kebab-case. Na dúvida entre esse arquivo e este `AGENTS.md`, **este aqui vence**.
- **`.codex/AGENTS.md` aponta para `.claude/skills/app-v7m/SKILL.md`, que não existe.** A única skill
  em `.claude/skills/` é a `ui-ux-pro-max`.
- **`.next/dev/lock` não existe nesta versão** (chegou na 16.3). Para saber se já há dev server no
  ar, cheque a porta, não esse arquivo.
- **`agentRules` não existe no `next.config.ts` da 16.2** — este `AGENTS.md` é mantido à mão, não é
  regenerado pelo `next dev`. O bloco `BEGIN/END:nextjs-agent-rules` está aqui por convenção; a
  partir da 16.3 é o `next dev` que passa a reescrevê-lo, e tudo que estiver **fora** dos marcadores
  é preservado. Mantenha o conteúdo próprio fora deles.
- **Playwright é obrigatório no CI**, mesmo que documentos antigos digam que teste automatizado é
  "decisão futura". `npm run test:e2e` roda no gate e precisa passar.
