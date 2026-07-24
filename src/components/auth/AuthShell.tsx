import type { ReactNode } from "react";
import { LifeBuoy } from "lucide-react";

import {
  LEGAL_PRIVACY_URL,
  LEGAL_TERMS_URL,
  SUPPORT_WHATSAPP_URL,
} from "@/lib/public-config";

// Casca da tela de entrada (handoff auth): fundo animado + navbar (logo + Ajuda)
// + footer (legal + LGPD), ambas com a linha-gradiente dourada. Só a auth usa.
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="auth-screen">
      <div className="auth-bg" aria-hidden />

      {/* Navbar */}
      <header className="auth-bar top-0 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="V7M" className="h-6 w-auto" />
            <span className="h-5 w-px bg-white/20" aria-hidden />
            <span className="text-sm font-semibold text-white">Promotor</span>
          </div>
          <a
            href={SUPPORT_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            <LifeBuoy aria-hidden className="size-4" />
            Ajuda
          </a>
        </div>
        <div className="gold-rule" />
      </header>

      {/* Conteúdo (entre as barras, centralizado) */}
      <main
        id="main"
        className="relative z-10 mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-6xl items-center px-5 py-10 sm:px-8"
      >
        <div className="w-full">{children}</div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex min-h-16 max-w-6xl flex-col items-center justify-center gap-1 border-t border-white/15 px-5 py-4 text-center sm:flex-row sm:justify-between sm:px-8">
          <p className="text-xs text-white/75">
            <a href={LEGAL_TERMS_URL} className="hover:text-white transition-colors">Termos</a>
            {" · "}
            <a href={LEGAL_PRIVACY_URL} className="hover:text-white transition-colors">Privacidade</a>
            {" · "}
            <a href="https://v7m.org" className="hover:text-white transition-colors">V7M</a>
            {" · © 2026"}
          </p>
          <p className="text-xs text-white/55">
            Dados tratados conforme a LGPD.
          </p>
        </div>
      </footer>
    </div>
  );
}

/** Overlay de loading global (transição pro painel após o login). */
export function AuthOverlay() {
  return (
    <div className="auth-overlay" role="status" aria-label="Entrando…">
      <div className="auth-ring" aria-hidden />
    </div>
  );
}
