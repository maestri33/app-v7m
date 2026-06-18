"use client";

import { useState } from "react";

/** Botão "copiar" para o link de captação do promotor. Feedback inline. */
export function CopyButton({
  value,
  label = "Copiar",
  className = "",
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard pode falhar (sem HTTPS / permissão negada) — falha em silêncio.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      className={`text-xs font-semibold text-gold-ink underline cursor-pointer hover:text-gold-deep whitespace-nowrap ${className}`.trim()}
    >
      {copied ? "Copiado!" : label}
    </button>
  );
}
