import type { ReactNode } from "react";

// Casca da tela de entrada (handoff auth): fundo animado + navbar (logo + Ajuda)
// + footer (legal + LGPD), ambas com a linha-gradiente dourada. Só a auth usa.
const HELP_WHATSAPP = "https://wa.me/5542998171770";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Fundo animado (fixed, atrás de tudo) + grain reaproveitado */}
      <div className="auth-bg grain" aria-hidden />

      {/* Navbar */}
      <header className="auth-bar top-0 h-[60px] pt-[env(safe-area-inset-top)]">
        <div className="flex h-[60px] items-center justify-between px-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="V7M" className="h-[22px] w-auto" />
          <a
            href={HELP_WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center min-h-[44px] rounded-full border border-[rgb(231_228_221/0.14)] px-4 text-[13.5px] font-semibold text-[#b4b4bb] transition-colors hover:text-white hover:border-[rgb(217_177_90/0.4)] hover:bg-[rgb(217_177_90/0.06)]"
          >
            Ajuda
          </a>
        </div>
        <div className="gold-rule" />
      </header>

      {/* Conteúdo (entre as barras, centralizado) */}
      <main
        id="main"
        className="fixed inset-x-0 top-[60px] bottom-[72px] overflow-hidden flex items-center justify-center px-5"
      >
        <div className="w-full max-w-[26rem]">{children}</div>
      </main>

      {/* Footer */}
      <footer className="auth-bar bottom-0 h-[72px] pb-[env(safe-area-inset-bottom)]">
        <div className="gold-rule" />
        <div className="flex h-[72px] flex-col items-center justify-center gap-0.5 text-center">
          <p className="text-[12px] text-[rgb(180_180_187/0.8)]">
            <a href="https://v7m.org/termos" className="hover:text-white transition-colors">Termos</a>
            {" · "}
            <a href="https://v7m.org/privacidade" className="hover:text-white transition-colors">Privacidade</a>
            {" · "}
            <a href="https://v7m.org" className="hover:text-white transition-colors">V7M</a>
            {" · © 2026"}
          </p>
          <p className="text-[11px] text-[rgb(180_180_187/0.55)]">
            Dados tratados conforme a LGPD.
          </p>
        </div>
      </footer>
    </>
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
