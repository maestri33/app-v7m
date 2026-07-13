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
 * Casca app-like (régua do app dos alunos): frame flex de altura de viewport —
 * header fixo no topo, UMA faixa de rolagem (`<main class="app-scroll">`) e a
 * bottom-nav como rodapé do frame (sem `position: fixed`, sem padding de
 * compensação). safe-area no topo (header) e na base (nav).
 *
 * Quem vê o quê:
 *  - candidato em onboarding: sem nav (só o wizard).
 *  - training travado: sem nav; o TrainingGate empurra pro LMS.
 *  - promotor: aba do promotor.
 *  - coordinator/staff: o JWT ainda carrega essas roles, mas aqui eles acessam
 *    como promotor (área de coordenação mora em hub.v7m.org).
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
      <TrainingGate locked={locked} />
      <header className="shrink-0 z-40 bg-[var(--bg)]/90 backdrop-blur-sm pt-[env(safe-area-inset-top)]">
        <Container className="py-4 flex items-center justify-between gap-4">
          <Link
            href="/painel"
            className="group flex items-center gap-2.5 text-lg hover:opacity-90 transition-opacity"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="V7M" className="h-5 w-auto" />
            <span className="text-brand-gold-ink font-display" aria-hidden="true">·</span>
            <span className="font-display text-[var(--surface-text-muted)]">
              Promotor
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="text-sm text-[var(--surface-text-muted)] hidden sm:inline">
              {session.name ?? "Você"}
            </span>
          </div>
        </Container>
        <div className="gold-rule" />
      </header>
      {/* bg claro na faixa inteira: página curta em tela alta não deixa o fundo
          escuro (aurora) vazar abaixo do conteúdo — todas as páginas do shell
          são claras. */}
      <main id="main" className="app-scroll flex-1 bg-[var(--bg)]">
        {children}
      </main>
      {/* Rodapé do frame: a bottom-nav do promotor quando ela existe (ela já é o
          rodapé); senão, o footer institucional discreto. Nunca os dois — pra
          não comer conteúdo nem colidir. A assinatura dourada segue no header. */}
      {showPromoterNav ? <AppNav /> : <AppFooter />}
    </div>
  );
}
