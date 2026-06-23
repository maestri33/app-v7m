import type { ReactNode } from "react";
import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { ContextSwitcher } from "@/components/layout/ContextSwitcher";
import { AppNav } from "@/components/layout/AppNav";
import { LeadershipNav } from "@/components/layout/LeadershipNav";
import { TrainingGate } from "@/components/layout/TrainingGate";
import { isCoordinator, isPromoter, isTrainingLocked } from "@/lib/auth/roles";
import type { Session } from "@/lib/auth/server";

export type ShellContext = "promoter" | "coordination";

/**
 * Shell ÚNICO do app (promotor + coordenação) — uma casca só pras duas áreas.
 * O que muda: a aba de navegação e, pra quem acumula `coordinator`, um seletor
 * de contexto (Promotor | Coordenação) — troca de aba no MESMO login, não de app.
 *
 * Quem vê o quê:
 *  - candidato em onboarding: sem nav e sem seletor (só o wizard).
 *  - training travado: sem nav; o TrainingGate empurra pro LMS.
 *  - promotor: aba do promotor.
 *  - coordinator: aba do promotor + seletor + aba de coordenação.
 */
export function AppShell({
  session,
  context,
  children,
}: {
  session: Session;
  context: ShellContext;
  children: ReactNode;
}) {
  const locked = isTrainingLocked(session.roles);
  const showSwitcher = isCoordinator(session.roles) && !locked;
  const nav =
    context === "coordination" ? (
      <LeadershipNav />
    ) : isPromoter(session.roles) && !locked ? (
      <AppNav />
    ) : null;

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <TrainingGate locked={locked} />
      <header className="sticky top-0 z-40 border-b border-line-light bg-paper-soft/90 backdrop-blur-sm pt-[env(safe-area-inset-top)]">
        <Container className="py-4 flex items-center justify-between gap-4">
          <Link
            href="/painel"
            className="font-display text-lg hover:text-gold-ink transition-colors"
          >
            V7M<span className="text-gold-ink"> · </span>
            <span className="text-muted-on-light">
              {context === "coordination" ? "Coordenação" : "Promotor"}
            </span>
          </Link>
          <span className="text-sm text-muted-on-light hidden sm:inline">
            {session.name ?? "Você"}
          </span>
        </Container>
        {(showSwitcher || nav) && (
          <Container className="pb-2 flex flex-col gap-2">
            {showSwitcher && <ContextSwitcher context={context} />}
            {nav}
          </Container>
        )}
      </header>
      <main id="main" className="flex-1 pb-20">
        {children}
      </main>
      {nav && <AppNav />}
    </div>
  );
}
