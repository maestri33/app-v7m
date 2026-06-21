import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { PageHeader } from "@/components/ui/PageHeader";
import { LeadershipCheckFlow } from "@/components/auth/LeadershipCheckFlow";

// Entrada do coordenador — PÚBLICA (fora do route group gated (leadership)).
// Login por área: usa /api/leadership/auth/{check,login}, não o do colaborador.
export const metadata = { title: "Entrar · Coordenador" };

export default function LeadershipEntryPage() {
  return (
    <main id="main">
      <GrainSection className="bg-char text-paper min-h-[100dvh] flex items-center">
        <Container narrow>
          <PageHeader
            tone="dark"
            kicker="V7M · Coordenador"
            title="Entrar"
            subtitle="Acesso de quem coordena um polo. Use seu telefone."
          />
          <LeadershipCheckFlow />
          <p className="mt-8 text-sm text-muted-on-dark">
            Não coordena um polo?{" "}
            <Link href="/" className="text-gold-soft underline">
              Entrar como colaborador
            </Link>
            .
          </p>
        </Container>
      </GrainSection>
    </main>
  );
}