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
      className="inline-flex w-fit rounded-full border border-brand-border bg-brand-surface p-0.5 text-sm mt-2"
      aria-label="Trocar contexto"
    >
      <Link
        href="/painel"
        aria-current={onPromoter ? "page" : undefined}
        className={
          onPromoter
            ? "inline-flex items-center min-h-11 rounded-full px-4 bg-brand-ink text-brand-paper"
            : "inline-flex items-center min-h-11 rounded-full px-4 text-brand-muted hover:text-brand-ink transition-colors"
        }
      >
        Promotor
      </Link>
      <Link
        href="/coordenador"
        aria-current={!onPromoter ? "page" : undefined}
        className={
          !onPromoter
            ? "inline-flex items-center min-h-11 rounded-full px-4 bg-brand-ink text-brand-paper"
            : "inline-flex items-center min-h-11 rounded-full px-4 text-brand-muted hover:text-brand-ink transition-colors"
        }
      >
        Coordenação
      </Link>
    </nav>
  );
}
