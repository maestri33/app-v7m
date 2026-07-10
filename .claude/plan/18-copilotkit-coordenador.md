# Handoff — Copiloto de IA (CopilotKit) na área do Coordenador · app-v7m

> Status: **PROPOSTA (handoff)** — NÃO confirmado; Portões 1+2 pendentes
> com o Victor. Não é continuação do plano 17 (Leadership já está em
> produção desde o PR #4); é uma camada opcional em cima dele.
> Origem: avaliação da CopilotKit feita em 2026-07-10 sobre as 9 aplicações
> da plataforma. Veredito aqui: **bom encaixe, com ressalvas** — o piloto
> preferencial é o `admin-v7m` (staff); este repo vem em segundo.

---

## 0. Contexto

- **CopilotKit** (<https://docs.copilotkit.ai> ·
  <https://github.com/CopilotKit/CopilotKit>, MIT): framework React para
  copilotos embutidos na UI — chat que enxerga o estado do app
  (`useCopilotReadable`), generative UI, e um **Copilot Runtime** (route
  handler Node no próprio Next) falando com o LLM. Compatível com o nosso
  modelo de auth: cookies HttpOnly, cliente nunca vê token.
- A área do coordenador é **list-heavy + decisão** (filas de candidatos,
  matrículas, revisões — plano 17). É exatamente o perfil onde um copiloto
  de leitura agrega: resumir situação, apontar o que falta, achar itens.
- A plataforma hoje tem **zero LLM**. Introduzir um é decisão de produto
  (custo por token + LGPD), não só técnica → Portão 1 antes de codar.

## 1. O que construir

Copiloto **somente leitura** dentro do route group `(leadership)`:

1. **Deps:** `@copilotkit/react-core` + `@copilotkit/react-ui` (conferir
   versão nas docs; anti-bloat do plano 17 vale — lib nova só com porquê).
2. **Runtime:** route handler `app/api/copilot/route.ts`, self-hosted
   (sem CopilotKit Cloud). Gate no runtime: `readLeadershipSession()` —
   sem role de coordenador → 403. Nenhum token client-side.
3. **Provider** `<CopilotKit runtimeUrl="/api/copilot">` no
   `(leadership)/layout.tsx`; sidebar em pt-BR, abrível por botão (mesmo
   padrão role-gated do resto do app).
4. **Contexto por tela** via `useCopilotReadable`: no workspace de
   candidato, o candidato aberto; na fila de matrículas, a fila + filtros.
   Casos de uso alvo: "o que falta neste enrollment?", "resume a situação
   deste candidato", "quais revisões estão paradas?".
5. **Minimização de dados (LGPD):** mascarar CPF, chave PIX e credenciais
   da plataforma parceira antes de montar contexto pro LLM. `external_id`
   ok; PK nunca (regra do monólito).

## 2. O que NÃO fazer (limites duros)

- **Nenhuma ação de escrita via copiloto.** approve/reject, selfie/decide,
  document decide|reset, `fee/pay`, `fee/schedule`, `conclude` mexem em
  identidade/status/$$ reais — já são Portão 3 no CLAUDE.md; via IA, nem
  com Portão 3 por enquanto. IA resume, humano clica no `MatriculaActions`.
- Não tocar no front do colaborador (candidato/promotor) neste handoff —
  escopo é só a superfície do coordenador.
- Não renomear vocabulário travado (candidato/promotor/coordenador/staff).
- Não parsear `detail` — se o copiloto exibir erro do back, rotear por
  `switch(code)` como todo o resto (`lib/api/client.ts`).
- Não subir pra produção sem Portão 3 com Victor.

## 3. Decisões pendentes (Portão 1 com Victor)

| # | Decisão | Por quê |
|---|---|---|
| 1 | Provedor de LLM + DPA | Contexto tem CPF/documentos/PIX (LGPD). |
| 2 | Orçamento de tokens/mês | Primeiro custo de LLM da plataforma. |
| 3 | Fazer aqui ou esperar o piloto no `admin-v7m`? | Recomendação: piloto no staff primeiro (usuário interno, menor risco), depois portar pra cá. |
| 4 | Sidebar sempre visível vs. botão | UX do console do coordenador. |

## 4. Referências

- Handoffs irmãos: `admin-v7m/HANDOFF-copilotkit.md` (piloto preferencial)
  e `app-supletivo/HANDOFF-copilotkit.md` (baixa prioridade).
- Infra reusável deste repo: `lib/api` (envelope + `djangoFetch`),
  `lib/auth` (cookies `v7m_access`/`v7m_refresh`, `readLeadershipSession`),
  `components/ui`.
- Next 16 ≠ training data: ler `node_modules/next/dist/docs` ou usar o
  agente `next16-guide` antes de escrever o route handler do runtime.
