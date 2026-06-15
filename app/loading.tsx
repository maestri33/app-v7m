import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";

export default function Loading() {
  return (
    <GrainSection className="bg-paper-soft min-h-[40vh] flex items-center">
      <Container>
        <p className="kicker text-gold-ink">V7M</p>
        <p className="text-muted-on-light animate-pulse">Carregando…</p>
      </Container>
    </GrainSection>
  );
}
