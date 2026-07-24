import type { ReactNode } from "react";
import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { AppNav } from "@/components/layout/AppNav";
import { AppFooter } from "@/components/layout/AppFooter";
import { TrainingGate } from "@/components/layout/TrainingGate";
import { FitViewport } from "@/components/ui/fit-viewport";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { isPromoter, isTrainingLocked } from "@/lib/auth/roles";
import type { Session } from "@/lib/auth/server";

/**
 * Shell do app do promotor (candidato em onboarding → promotor pleno).
 *
 * App-like, alinhado à Auth: fundo animado dark-luxury; navbar fixa (logo +
 * tema) com a linha-gradiente dourada; UMA área de conteúdo que NUNCA scrolla —
 * se transborda, FitViewport escala pra caber (handoff §23). Rodapé do frame é
 * a bottom-nav do promotor (Início·Leads·Comissões·Conta) ou o footer
 * institucional quando não há nav. safe-area no topo e na base.
 *
 * Quem vê o quê: candidato em onboarding (sem nav, só o wizard); training
 * travado (TrainingGate empurra pro LMS); promotor (bottom-nav). coordinator/
 * staff acessam como promotor (coordenação mora em hub.v7m.org).
 */
export function AppShell({
  session,
  children,
}: {
  session: Session;
  children: ReactNode;
}) {
  const locked = isTrainingLocked(session.roles);
  const showPromoterNav = isPromoter(session.roles) && !locked;

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="app-bg grain" aria-hidden />
      <TrainingGate locked={locked} />
      <header className="shrink-0 z-40 bg-brand-char/70 backdrop-blur-md pt-[env(safe-area-inset-top)]">
        <Container className="py-3 flex items-center justify-between gap-4">
          <Link
            href="/painel"
            className="flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="V7M" className="h-5 w-auto" />
            <span className="text-brand-gold-ink font-display" aria-hidden="true">·</span>
            <span className="font-display text-[var(--surface-text-muted)] text-sm">
              Promotor
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span className="text-sm text-[var(--surface-text-muted)] hidden sm:inline">
              {session.name ?? "Você"}
            </span>
          </div>
        </Container>
        <div className="gold-rule" />
      </header>
      {/* Conteúdo NUNCA scrolla: FitViewport escala se transbordar. px respeita
          o gutter; o conteúdo das telas renderiza direto (sem GrainSection). */}
      <main id="main" className="flex-1 overflow-hidden px-[var(--gutter)] py-5">
        <FitViewport className="h-full">{children}</FitViewport>
      </main>
      {showPromoterNav ? <AppNav /> : <AppFooter />}
    </div>
  );
}

