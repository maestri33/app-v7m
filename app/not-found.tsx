import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";

export default function NotFound() {
  return (
    <GrainSection className="bg-paper-soft min-h-[60vh] flex items-center">
      <Container>
        <p className="kicker text-gold-ink">V7M · 404</p>
        <h1 className="mb-3" style={{ fontSize: "var(--text-h2-sm)" }}>
          Página não encontrada
        </h1>
        <p className="text-muted-on-light mb-8 max-w-prose">
          O link que você abriu não existe ou mudou de endereço. Tente voltar
          pro início.
        </p>
        <Link href="/" className="btn btn-xl inline-block">
          Voltar pro início
        </Link>
      </Container>
    </GrainSection>
  );
}
