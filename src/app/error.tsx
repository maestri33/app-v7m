"use client";

import { useEffect } from "react";

import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

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
    <GrainSection className="bg-brand-bg min-h-[60dvh] flex items-center">
      <Container>
        <PageHeader
          kicker="V7M · Erro"
          title="Algo deu errado"
          subtitle="A gente já registrou. Tenta de novo — se persistir, abre o app de novo e entra de novo na sua conta."
        />
        {error.digest && (
          <p className="text-xs text-brand-muted/70 mb-4">ref: {error.digest}</p>
        )}
        <Button type="button" onClick={reset} size="xl">
          Tentar de novo
        </Button>
      </Container>
    </GrainSection>
  );
}
