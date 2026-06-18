import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";

export default function NotFound() {
  return (
    <GrainSection className="bg-paper-soft min-h-[60vh] flex items-center">
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
