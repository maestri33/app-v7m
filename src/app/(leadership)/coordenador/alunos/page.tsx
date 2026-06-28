import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { AlunosList } from "@/components/leadership/AlunosList";
import { djangoFetch, DjangoError } from "@/lib/api/client";
import { LEADERSHIP, type HubStudentRow, type PaginatedOut } from "@/lib/api/leadership";

export const dynamic = "force-dynamic";
export const metadata = { title: "Alunos" };

// GET /leadership/students?limit=&offset= → PaginatedStudentsOut (envelope
// {items,total,limit,offset}, api/leadership.py). Lista os alunos do polo. As
// decisões (prova/documento/pendência/diploma) mexem em identidade/status reais →
// confirmação em 2 passos no workspace, Portão 3 com o Victor.
export default async function AlunosPage() {
  let data: PaginatedOut<HubStudentRow> | null = null;
  let errorCode: string | null = null;
  try {
    data = await djangoFetch<PaginatedOut<HubStudentRow>>(
      `${LEADERSHIP}/students?limit=200&offset=0`,
    );
  } catch (e) {
    errorCode = e instanceof DjangoError ? e.body.code : "ERROR";
  }

  const items = data?.items ?? [];

  return (
    <Container className="py-10">
      <PageHeader
        kicker="V7M · Coordenador"
        title="Alunos"
        subtitle="Os alunos do seu polo — prova, documentação, pendências e diploma."
      />

      {errorCode ? (
        <Card className="text-brand-muted">
          Não deu pra carregar os alunos agora ({errorCode}). Atualize a página.
        </Card>
      ) : items.length === 0 ? (
        <Card className="text-brand-muted">
          Nenhum aluno no seu polo por enquanto.
        </Card>
      ) : (
        <AlunosList items={items} />
      )}
    </Container>
  );
}
