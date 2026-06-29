import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";

export default function Loading() {
  return (
    <GrainSection className="bg-brand-bg min-h-[40dvh] flex items-center">
      <Container>
        <p className="kicker text-brand-gold-ink">V7M</p>
        <p className="flex items-center gap-2 text-brand-muted">
          <span className="spinner" aria-hidden />
          Carregando…
        </p>
      </Container>
    </GrainSection>
  );
}
