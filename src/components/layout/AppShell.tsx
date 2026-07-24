import type { ReactNode } from "react";
import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { AppNav } from "@/components/layout/AppNav";
import { AppFooter } from "@/components/layout/AppFooter";
import { TrainingGate } from "@/components/layout/TrainingGate";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { isPromoter, isTrainingLocked } from "@/lib/auth/roles";
import type { Session } from "@/lib/auth/server";

/**
 * Shell do app do promotor (candidato em onboarding → promotor pleno).
 *
 * App-like, alinhado à Auth: superfícies sólidas, cabeçalho fixo e conteúdo com
 * rolagem natural. O rodapé é a bottom-nav do promotor ou o footer institucional
 * para candidatos em onboarding, respeitando safe-area no topo e na base.
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
    <div className="flex min-h-dvh flex-col bg-[var(--bg)] text-[var(--surface-text)]">
      <TrainingGate locked={locked} />
      <header className="app-header sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
        <Container className="flex min-h-16 items-center justify-between gap-4 py-2">
          <Link
            href="/painel"
            className="flex min-h-11 items-center gap-3 rounded-xl px-1 transition-opacity hover:opacity-80"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="V7M" className="h-6 w-auto" />
            <span className="h-5 w-px bg-[var(--surface-border)]" aria-hidden="true" />
            <span className="text-sm font-bold tracking-tight text-[var(--surface-text)]">Promotor</span>
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
      <main id="main" className={showPromoterNav ? "app-main app-main-with-nav" : "app-main"}>
        {children}
      </main>
      {showPromoterNav ? <AppNav /> : <AppFooter />}
    </div>
  );
}

