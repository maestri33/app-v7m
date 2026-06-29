import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

export default function NotFound() {
  return (
    <GrainSection className="bg-brand-bg min-h-[60dvh] flex items-center">
      <Container>
        <PageHeader
          kicker="V7M · 404"
          title="Página não encontrada"
          subtitle="O link que você abriu não existe ou mudou de endereço. Tente voltar pro início."
        />
        <Button href="/" size="xl">
          Voltar pro início
        </Button>
      </Container>
    </GrainSection>
  );
}
