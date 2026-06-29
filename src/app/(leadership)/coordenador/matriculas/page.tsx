import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { MatriculasList } from "@/components/leadership/MatriculasList";
import { djangoFetch, DjangoError } from "@/lib/api/client";
import { LEADERSHIP, type HubEnrollmentRow } from "@/lib/api/leadership";

export const dynamic = "force-dynamic";
export const metadata = { title: "Matrículas" };

// L2 (leitura). GET /leadership/enrollments?status=awaiting_release →
// HubEnrollmentRowOut[] (OpenAPI vivo). A fila enche com aluno que terminou a
// coleta (status awaiting_release). A matrícula em si (pagar taxa + concluir)
// mexe em R$ real e credenciais do aluno → Portão 3 com o Victor, não aqui.
export default async function MatriculasPage() {
  let data: HubEnrollmentRow[] | null = null;
  let errorCode: string | null = null;
  try {
    data = await djangoFetch<HubEnrollmentRow[]>(
      `${LEADERSHIP}/enrollments?status=awaiting_release`,
    );
  } catch (e) {
    errorCode = e instanceof DjangoError ? e.body.code : "ERROR";
  }

  return (
    <Container className="py-10">
      <PageHeader
        kicker="V7M · Coordenador"
        title="Matrículas"
        subtitle="Alunos que terminaram a coleta e aguardam você fazer a matrícula."
      />

      {errorCode ? (
        <Card className="text-brand-muted">
          Não deu pra carregar as matrículas agora ({errorCode}). Atualize a página.
        </Card>
      ) : !data || data.length === 0 ? (
        <Card className="text-brand-muted">
          Nenhuma matrícula aguardando no seu polo. Tudo em dia.
        </Card>
      ) : (
        <MatriculasList items={data} />
      )}
    </Container>
  );
}
