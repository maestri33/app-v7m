import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { CandidatosList } from "@/components/leadership/CandidatosList";
import type { CandidateAwaiting } from "@/components/leadership/CandidatosList";
import { djangoFetch, DjangoError } from "@/lib/api/client";
import { LEADERSHIP } from "@/lib/api/leadership";

export const dynamic = "force-dynamic";
export const metadata = { title: "Candidatos" };

// L2 (leitura). GET /leadership/candidates → CandidateAwaitingOut[] (contrato
// confirmado no OpenAPI vivo 2026-06-23). As DECISÕES (aprovar/rejeitar/decidir
// selfie+doc) são identidade real → entram num Portão com o Victor, não aqui.
export default async function CandidatosPage() {
  let data: CandidateAwaiting[] | null = null;
  let errorCode: string | null = null;
  try {
    data = await djangoFetch<CandidateAwaiting[]>(`${LEADERSHIP}/candidates`);
  } catch (e) {
    errorCode = e instanceof DjangoError ? e.body.code : "ERROR";
  }

  return (
    <Container className="py-10">
      <PageHeader
        kicker="V7M · Coordenador"
        title="Candidatos"
        subtitle="Quem está aguardando a sua aprovação pra virar promotor."
      />

      {errorCode ? (
        <Card className="text-muted-on-light">
          Não deu pra carregar os candidatos agora ({errorCode}). Atualize a página.
        </Card>
      ) : !data || data.length === 0 ? (
        <Card className="text-muted-on-light">
          Nenhum candidato aguardando no seu polo. Tudo em dia.
        </Card>
      ) : (
        <CandidatosList items={data} />
      )}
    </Container>
  );
}
