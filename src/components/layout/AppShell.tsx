import type { ReactNode } from "react";
import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { ContextSwitcher } from "@/components/layout/ContextSwitcher";
import { AppNav } from "@/components/layout/AppNav";
import { LeadershipNav } from "@/components/layout/LeadershipNav";
import { TrainingGate } from "@/components/layout/TrainingGate";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { isCoordinator, isPromoter, isTrainingLocked } from "@/lib/auth/roles";
import type { Session } from "@/lib/auth/server";

export type ShellContext = "promoter" | "coordination";

/**
 * Shell ÚNICO do app (promotor + coordenação) — uma casca só pras duas áreas.
 * O que muda: a aba de navegação e, pra quem acumula `coordinator`, um seletor
 * de contexto (Promotor | Coordenação) — troca de aba no MESMO login, não de app.
 *
 * Casca app-like (régua do app dos alunos): frame flex de altura de viewport —
 * header fixo no topo, UMA faixa de rolagem (`<main class="app-scroll">`) e a
 * bottom-nav como rodapé do frame (sem `position: fixed`, sem padding de
 * compensação). safe-area no topo (header) e na base (nav).
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
  const coordination = context === "coordination";
  // bottom-nav de promotor SÓ no contexto promotor. No contexto coordenação a
  // navegação é a LeadershipNav (topo) — sem o bottom-nav de promotor, senão
  // "Leads" duplica (um → /coordenador/leads, outro → /leads) e embaralha o
  // contexto. O seletor já leva de volta ao promotor.
  const showPromoterNav = !coordination && isPromoter(session.roles) && !locked;
  const topNav = coordination ? <LeadershipNav /> : null;

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <TrainingGate locked={locked} />
      <header className="shrink-0 z-40 border-b border-[var(--surface-border)] bg-[var(--bg)]/90 backdrop-blur-sm pt-[env(safe-area-inset-top)]">
        <Container className="py-4 flex items-center justify-between gap-4">
          <Link
            href="/painel"
            className="font-display text-lg text-[var(--surface-text)] hover:text-brand-gold-ink transition-colors"
          >
            V7M<span className="text-brand-gold-ink"> · </span>
            <span className="text-[var(--surface-text-muted)]">
              {coordination ? "Coordenação" : "Promotor"}
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="text-sm text-[var(--surface-text-muted)] hidden sm:inline">
              {session.name ?? "Você"}
            </span>
          </div>
        </Container>
        {(showSwitcher || topNav) && (
          <Container className="pb-2 flex flex-col gap-2">
            {showSwitcher && <ContextSwitcher context={context} />}
            {topNav}
          </Container>
        )}
      </header>
      {/* bg claro na faixa inteira: página curta em tela alta não deixa o fundo
          escuro (aurora) vazar abaixo do conteúdo — todas as páginas do shell
          são claras. */}
      <main id="main" className="app-scroll flex-1 bg-[var(--bg)]">
        {children}
      </main>
      {showPromoterNav && <AppNav />}
    </div>
  );
}
