@AGENTS.md

# CLAUDE.md — App do Promotor (V7M)

Frontend Next.js (repo NOVO `maestri33/app-promotor`). Este é o app do
**colaborador** (candidato → treinamento → promotor pleno). NÃO toca no
`~/mvp/backend/` (que é o monólito Django+Ninja); o backend é uma dependência
externa, consumida via HTTP em `/api/v1/collaborators/...`.

## Fonte da verdade

- **Palavra do Victor** nesta sessão > este arquivo.
- **Plano do projeto:** `.claude/plan/16-frontend-promotor.md` (CONFIRMADO,
  Portões 1+2 em 2026-06-15). Régua: o plano + o código de hoje. **Não
  confiar em PRD/doc de IA antigo.**
- **Backend consumido:** `~/mvp/.claude/CONVENTION.md` §1/§3 + `~/mvp/backend/wiki/api/collaborators.md`
  + OpenAPI vivo em `/api/v1/collaborators/docs` (NÃO uma spec congelada).
- **Workflow (3 portões):** `~/mvp/.claude/WORKFLOW.md` (questionário →
  plano confirmado → testes aprovados). **Sem pressa.** Cada milestone (M0–M5)
  vai ao Portão 3 separado.

## Regras do monólito que valem aqui

- `external_id` (UUID) é o que o back expõe — **nunca** trabalhar com PK.
- Erros do back: envelope `{detail, code, …extra}` (regra do `api/clients.md` /
  `api/collaborators.md` — **front roteia por `switch(code)`**, NUNCA
  parseando `detail`).
- Auth: cookies HttpOnly (`v7m_access` + `v7m_refresh`) via route handlers do
  Next (`app/api/auth/{login,refresh,logout}/route.ts`); cliente nunca toca no
  token.
- Idioma: código em **inglês** (identificadores), textos voltados a humano
  em **pt-BR**. Sem exceção. (Regra §12 do CLAUDE.md do monólito.)
- **Não criar arquivo que não foi pedido:** sem README por módulo, sem
  Makefile, sem `AGENTS.md`/`RUNBOOK.md`/`CONTRIBUTING.md` extra, sem stack
  de observability. (Regra §1.3 do monólito — explosão de doc é sintoma
  de delírio.)

## Pendências de produto (perguntar ao Victor — NÃO decidir sozinho)

- Copy do hero da home (atualmente placeholder).
- Pix do candidato mexe R$0,01 real (Asaas/DICT) — **Portão 3 com Victor** na
  hora dessa tela.
- Selfie precisa de foto real — **Portão 3 com Victor**.
- CNH-e do Victor: usar a foto real só se ele autorizar.
- Notifies de WhatsApp/email saem via `users/roles/notifications.py` (já no
  backend). **Sem notify no front** — o app só exibe o status.

## Fora do escopo (proibido, mesmo que pareça boa ideia)

- Telas do coordenador (FUTURO, atrás da Fatia D do plan/15).
- Testes automatizados (vitest/playwright) — decisão futura.
- Storybook / Figma / observability / CMS.
- Banco local / persistência no front.
- Refactor "preventivo" sem pedido.

## Tarefas do Victor

- M0: scaffold (este commit).
- M1: auth (entrar/validar/cadastro + role-router) — mexer OTP no zap.
- M2a: wizard perfil+endereço (s/IA, s/foto, s/$$).
- M2b: documento foto+OCR (depende da Fatia B do plan/15).
- M2c: pix R$0,01 + selfie async (depende da Fatia C).
- M3: treinamento (depende de IA grade).
- M4: painel do promotor (só leitura).
- M5: polish + a11y.
