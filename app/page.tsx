import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { PageHeader } from "@/components/ui/PageHeader";
import { CheckFlow } from "@/components/auth/CheckFlow";

// Este app é o DESTINO do CTA da landing (job.v7m.org) — não é a landing.
// Quem chega já decidiu: a primeira tela é a ENTRADA (check por telefone),
// não um hero de marketing.
export const metadata = { title: "Entrar" };

export default function HomePage() {
  return (
    <main id="main">
      <GrainSection className="bg-char text-paper min-h-[100dvh] flex items-center">
        <Container narrow>
          <PageHeader
            tone="dark"
            title="Entrar"
            subtitle="Use seu telefone. Sem cadastro ainda? A gente cria na hora."
          />
          <CheckFlow />
        </Container>
      </GrainSection>
    </main>
  );
}
