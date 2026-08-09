@AGENTS.md

# CLAUDE.md — App do Promotor (V7M)

Frontend Next.js — o app do **lado interno/V7M**, **role-gated**: quem trabalha
com a gente. **candidato a promotor** (afiliado em onboarding) → **promotor
pleno** (com treinamento obrigatório). Cobre o grupo da API **collaborators**
(candidato → treinamento → promotor).

NÃO é o app do **cliente** final — esse é o repositório `app-supletivo`
(`app.supletivo.net.br`; cliente = lead → enrollment → student → veteran; outra
base de código, mesmo backend).

NÃO é o portal do **coordenador** — esse é o repositório `hub-v7m`
(`hub.v7m.org`), que consome `/api/v1/leadership/`. Quem tem a role
`coordinator` acessa este app **como promotor**; a área de coordenação abre no
hub. É o que `src/lib/auth/roles.ts` implementa hoje: não existe rota nem route
handler de leadership nesta árvore — só o arquivo de tipos
`src/lib/api/leadership.ts`, que sobrou do escopo antigo.

NÃO é o painel **staff** — esse é o repositório `admin-v7m` (`admin.v7m.org`),
que consome `/api/v1/staff/`.

O backend é dependência externa, consumida via HTTP: repositório
`maestri33/backend-supletivo`, grupo `/api/v1/collaborators/`.

## Vocabulário travado (NÃO renomear sem perguntar)

| Papel | Onde mora no app | Origem do dado |
|---|---|---|
| **candidato** | `app-v7m` | `candidates` (candidato a virar promotor) |
| **promotor** | `app-v7m` | `promoter` (afiliado pleno) |
| **coordenador** | `hub-v7m` (`hub.v7m.org`) | aditivo em cima de promotor (`coordinator` role) — todo coordenador é promotor, sempre; neste app ele entra **como promotor** |
| **staff** | `admin-v7m` (`admin.v7m.org`) | `staff` — painel global; este app só reconhece a role pra rotear pra fora |
| **lead / enrollment / student / veteran** | `app-supletivo` | cliente final, este app **NÃO mexe** |

**Vínculos do ciclo do cliente** (referência, não implementado aqui):
- **Lead** é captado por um **promotor** (afiliado comercial).
- Lead paga a matrícula (PIX checkout) → vira **enrollment**.
- Enrollment **herda o polo do promotor** → deixa de ser "do promotor", vira "do
  polo" → responsabilidade passa pro **coordenador do polo**.
- Quando enrollment tem documentação mínima, coordenador finaliza matrícula na
  instituição parceira (a gente é intermediária) → recebe 2 PIX (1ª à vista + 2ª
  agendada) + login/senha da plataforma parceira → insere no endpoint →
  enrollment vira **student** → libera acesso.
- Student que termina o curso → **veteran**.

**Quem paga o quê:**
- **Lead** paga **a gente** (checkout) — front: `app-supletivo`.
- **Candidato/promotor** cadastra **a chave PIX dele** pra **receber comissões**
  — entrada de dinheiro pro afiliado — front: `app-v7m` (`/me/pix`).
- **Coordenador** paga a **instituição parceira** (taxa de matrícula) — saída de
  dinheiro da empresa — front: **`hub-v7m`**, não este app. Fica aqui como
  referência do ciclo; a implementação é lá. O coordenador obtém login/senha e
  QR Pix **na plataforma parceira** e cola no hub, usando:
  - `POST /api/v1/leadership/enrollments/{id}/fee/pay` — `{ qr_code, amount? }`
    (1ª parcela à vista).
  - `POST /api/v1/leadership/enrollments/{id}/fee/schedule` — `{ qr_code, amount? }`
    (2ª parcela agendada em 30d; QR precisa ter vencimento).
  - `POST /api/v1/leadership/enrollments/{id}/conclude` —
    `{ platform_login, platform_password, platform_url?, platform_notes? }`
    (login do aluno na instituição parceira; promove enrollment → student).
  - Esses três endpoints **não** têm route handler nem UI nesta árvore. Se
    aparecer referência a `app/api/leadership/enrollments/...` ou a um
    componente `MatriculaActions`, é de escopo antigo — não existe mais aqui.

## Modelo de roles (no código)

`lib/auth/roles.ts` separa em três eixos:
- **stage**: `candidate` → `promoter` (funil do afiliado).
- **gate**: `training` (trava — força `/treinamento` enquanto o LMS não libera).
- **grant**: `coordinator` (aditivo, empilha sobre `promoter`).

`staff` é reconhecida pra rotear pra superfície global (expansão 2026-06-21).

## Fonte da verdade

- **Palavra do Victor nesta sessão** > este arquivo.
- **O código vence a prosa.** Havia aqui uma nota de "escopo expandido
  (2026-06-21)" dizendo que este app cobria os 3 grupos e que a área do
  coordenador estaria em produção desde o PR #4. **A árvore atual não confirma
  isso:** não existe rota, tela nem route handler de leadership ou staff —
  só o arquivo de tipos `src/lib/api/leadership.ts`. O `roles.ts` diz o mesmo,
  que a coordenação mora em `hub.v7m.org`, e o repositório `hub-v7m` existe e é
  publicado. Escopo real deste app hoje: **collaborators**. Se a intenção for
  trazer leadership de volta pra cá, isso é decisão do Victor — confirme antes
  de escrever código de coordenador em qualquer um dos dois repos.
- **Plano:** `.claude/plan/16-frontend-promotor.md` (CONFIRMADO Portões 1+2 em
  2026-06-15) — válido para a base **collaborators**. **Não confiar em PRD/doc
  de IA antigo.**
- **Backend consumido:** repositório `maestri33/backend-supletivo` —
  `docs/api/collaborators.md`, `docs/api/leadership.md` e `wiki/frontend-integracao.md`
  (guia de integração dos apps) + OpenAPI vivo em
  `/api/v1/{collaborators,leadership,staff}/docs` (NÃO uma spec congelada).
  Os caminhos `~/mvp/...` são da máquina do Victor e não resolvem numa sessão
  limpa; ver a tabela de fontes no `AGENTS.md`.
- **Workflow (3 portões):** `~/mvp/.claude/WORKFLOW.md` (questionário → plano
  confirmado → testes aprovados). **Sem pressa.** Cada milestone vai ao Portão 3
  separado.

## Regras do monólito que valem aqui

- `external_id` (UUID) é o que o back expõe — **nunca** trabalhar com PK.
- Erros do back: envelope `{detail, code, …extra}`. Front **roteia por
  `switch(code)`**, NUNCA parseando `detail`. (`lib/api/client.ts` expõe
  `DjangoError` + `getErrorMessage()` alinhado ao app dos alunos.)
- Auth: cookies HttpOnly (`v7m_access` + `v7m_refresh`) via route handlers do
  Next (`app/api/auth/*`); cliente nunca toca no token. **Decisão 2026-06-23:**
  manter esse modelo (coordenador tem poderes administrativos → não expor JWT a
  XSS). NÃO usar rewrite `/api/*` nem token client-side.
- Idioma: código em **inglês** (identificadores), textos voltados a humano em
  **pt-BR**. Sem exceção. (Regra §12 do CLAUDE.md do monólito.)
- **Não criar arquivo que não foi pedido:** sem README por módulo, sem
  Makefile, sem `AGENTS.md`/`RUNBOOK.md`/`CONTRIBUING.md` extra, sem stack de
  observability. (Regra §1.3 do monólito.)
- **Casca do app = `src/`** com alias `@/*` → `./src/*`. Componentes `ui/` em
  **kebab-case**. Tokens de cor: `--color-brand-*` (paleta dourado/preto/prata,
  valores próprios — NÃO bandeira do Brasil). Fonte **Geist**. CSP/headers em
  `next.config.ts`. PWA: SW conservador (só `/_next/static/`, **nunca** `/api/*`
  nem HTML autenticado).

## Fora do escopo deste app (mesmo que pareça boa ideia)

- Telas do **cliente** (lead/enrollment/student/veteran) — mora em `/root/app-supletivo`.
- Testes unitários (vitest) — decisão futura. **Playwright NÃO é futuro:**
  `npm run test:e2e` já roda no gate do CI (`.github/workflows/ci.yml`) e precisa
  passar. O harness de QA manual `scripts/shot.mjs` segue valendo em paralelo.
- Storybook / Figma / observability / CMS.
- Banco local / persistência no front.
- Refactor "preventivo" sem pedido.

## Pendências de produto (perguntar ao Victor — NÃO decidir sozinho)

- Copy do hero da home (atualmente placeholder).
- Pix do candidato mexe R$ real (Asaas/DICT) — **Portão 3 com Victor** na hora
  dessa tela.
- Selfie precisa de foto real — **Portão 3 com Victor**.
- CNH-e do Victor: usar a foto real só se ele autorizar.
- Decisões do coordenador (approve/reject/selfie/decide/document decide|reset,
  fee/pay, fee/schedule, conclude) mexem em identidade/status/$$ reais →
  **Portão 3** antes de testar fora de sandbox.
- Notifies de WhatsApp/email saem via `users/roles/notifications.py` (já no
  backend). **Sem notify no front** — o app só exibe o status.

## Tarefas do Victor (ordem de execução)

Base **collaborators**:

- M0: scaffold.
- M1: auth (entrar/validar/cadastro + role-router) + contexto promotor/coordenador unificado.
- M2a: wizard perfil+endereço (s/IA, s/foto, s/$$).
- M2b: documento foto+OCR.
- M2c: pix da chave do candidato (entrada, não saída) + selfie async.
- M3: treinamento (papel do promotor, não do cliente).
- M4: painel do promotor (só leitura) + dashboard do coordenador (fila de
  candidatos, fila de matrículas, revisões).
- M5: polish + a11y.

Superfícies **leadership / staff** (expansão 2026-06-21):

- L1 (leadership/coordenador): leads + auth — **EM PRODUÇÃO desde 2026-06-21 (PR #4)**.
- Leadership ampliado (enrollments, reviews, candidatos, **alunos, promotores,
  treinamento-autoria**) — entregue na área do coordenador; revisões clicáveis.
- **staff** (hubs, finance, integrações, views globais) entra conforme o Victor
  priorizar.
