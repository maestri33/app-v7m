import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";

export default function Loading() {
  return (
    <GrainSection className="bg-paper-soft min-h-[40vh] flex items-center">
      <Container>
        <p className="kicker text-gold-ink">V7M</p>
        <p className="flex items-center gap-2 text-muted-on-light">
          <span className="spinner" aria-hidden />
          Carregando…
        </p>
      </Container>
    </GrainSection>
  );
}
