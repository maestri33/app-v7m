"use client";

import Link from "next/link";

/**
 * Seletor de contexto pra quem acumula coordenação (coordinator+promoter).
 * Promotor ↔ Coordenação no MESMO login — não troca de app, troca a aba ativa.
 * Só é renderizado pelo AppShell quando a pessoa é coordinator e não está travada
 * em treinamento. Cada pílula tem altura ≥44px (min-h-11) pra alvo de toque.
 */
export function ContextSwitcher({ context }: { context: "promoter" | "coordination" }) {
  const onPromoter = context === "promoter";

  return (
    <nav
      className="inline-flex w-fit rounded-full border border-[var(--surface-border)] bg-[var(--surface)] p-0.5 text-sm mt-2"
      aria-label="Trocar contexto"
    >
      <Link
        href="/painel"
        aria-current={onPromoter ? "page" : undefined}
        className={
          onPromoter
            ? "inline-flex items-center min-h-11 rounded-full px-4 bg-[var(--surface-text)] text-[var(--bg)]"
            : "inline-flex items-center min-h-11 rounded-full px-4 text-[var(--surface-text-muted)] hover:text-[var(--surface-text)] transition-colors"
        }
      >
        Promotor
      </Link>
      <Link
        href="/coordenador"
        aria-current={!onPromoter ? "page" : undefined}
        className={
          !onPromoter
            ? "inline-flex items-center min-h-11 rounded-full px-4 bg-[var(--surface-text)] text-[var(--bg)]"
            : "inline-flex items-center min-h-11 rounded-full px-4 text-[var(--surface-text-muted)] hover:text-[var(--surface-text)] transition-colors"
        }
      >
        Coordenação
      </Link>
    </nav>
  );
}
