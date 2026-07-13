import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { PageHeader } from "@/components/ui/page-header";
import { CheckFlow } from "@/components/auth/CheckFlow";

// Este app é o DESTINO do CTA da landing (job.v7m.org) — não é a landing.
// Quem chega já decidiu: a primeira tela é a ENTRADA (check por telefone),
// não um hero de marketing.
export const metadata = { title: "Entrar" };

// SEM prerender estático: página estática sai com `s-maxage=31536000` e o
// Caddy/Cloudflare seguram o HTML velho por até 1 ano entre deploys (visto em
// produção: "Failed to find Server Action … older deployment"). Dinâmica como
// o resto do app → sem cache compartilhado de HTML.
export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main id="main">
      <GrainSection className="bg-brand-ink text-[var(--surface)] min-h-[100dvh] flex items-center">
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
