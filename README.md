# Promotor V7M — Frontend

App do colaborador (candidato → treinamento → promotor pleno) do projeto V7M.

- Stack: Next.js (App Router) + TypeScript + Tailwind v4 (`@theme inline`).
- Backend consumido: `~/mvp/backend/` (Django + Ninja), em
  `/api/v1/collaborators/`.
- Plano + decisões: `.claude/plan/16-frontend-promotor.md`.

## Comandos

```bash
npm install
npm run dev        # dev server (porta 3000 por padrão)
npm run lint
npm run build
```

## Estrutura

```
app/                    # App Router
  globals.css           # Tokens + @theme inline + base
  layout.tsx            # <html lang="pt-BR"> + fontes (next/font/google)
  page.tsx              # Home (hero)
components/
  ui/Button.tsx
  layout/{Container,Section,GrainSection}.tsx
.claude/                # Plano, WORKFLOW, wiki
```
