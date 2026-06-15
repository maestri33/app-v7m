"use client";

import { useEffect } from "react";

import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <GrainSection className="bg-paper-soft min-h-[60vh] flex items-center">
      <Container>
        <p className="kicker text-gold-ink">V7M · Erro</p>
        <h1 className="mb-3" style={{ fontSize: "var(--text-h2-sm)" }}>
          Algo deu errado
        </h1>
        <p className="text-muted-on-light mb-8 max-w-prose">
          A gente já registrou. Tenta de novo — se persistir, abre o app de
          novo e entra de novo na sua conta.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-on-light/70 mb-4">ref: {error.digest}</p>
        )}
        <button type="button" onClick={reset} className="btn btn-xl">
          Tentar de novo
        </button>
      </Container>
    </GrainSection>
  );
}
