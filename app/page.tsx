import { Button } from "@/components/ui/Button";
import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";

export default function HomePage() {
  return (
    <main id="main">
      <GrainSection
        id="hero"
        className="bg-char text-paper min-h-[88vh] flex items-center"
      >
        <Container>
          <p className="kicker text-gold-soft">V7M · Promotor</p>
          <h1
            className="text-paper"
            style={{ fontSize: "var(--text-hero)" }}
          >
            Promotor V7M
          </h1>
          <p className="mt-6 max-w-xl text-muted-on-dark text-lg">
            Seu painel do promotor — captação, treinamento e leads em um só lugar.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Button href="/entrar" size="xl">
              Entrar
              <span aria-hidden>→</span>
            </Button>
            <Button href="/cadastro" size="xl" variant="ghost">
              Quero ser promotor
            </Button>
          </div>
        </Container>
      </GrainSection>
    </main>
  );
}
