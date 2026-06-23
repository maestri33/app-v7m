import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { djangoFetch, DjangoError } from "@/lib/api/client";
import { LEADERSHIP } from "@/lib/api/leadership";

export const dynamic = "force-dynamic";
export const metadata = { title: "Revisões" };

/**
 * Baldes reais de GET /leadership/reviews (confirmado no back, leadership.py:201).
 * Objeto de 7 baldes (não array plano). Os campos de cada item ainda não estão
 * publicados no OpenAPI — renderizamos só a contagem por balde.
 */
const BUCKETS = [
  { key: "candidates_awaiting_approval", label: "Candidatos aguardando aprovação" },
  { key: "candidate_document", label: "Documentos de candidato em revisão" },
  { key: "candidate_selfie", label: "Selfies de candidato em revisão" },
  { key: "enrollment_rg", label: "RGs de matrícula em revisão" },
  { key: "enrollment_selfie", label: "Selfies de matrícula em revisão" },
  { key: "student_documents", label: "Documentos de aluno em revisão" },
  { key: "locked_promoters", label: "Promotores travados no treinamento" },
] as const;

export default async function RevisoesPage() {
  let data: Record<string, unknown> | null = null;
  let errorCode: string | null = null;
  try {
    data = await djangoFetch<Record<string, unknown>>(`${LEADERSHIP}/reviews`);
  } catch (e) {
    errorCode = e instanceof DjangoError ? e.body.code : "ERROR";
  }

  const counts = BUCKETS.map((b) => ({
    ...b,
    count: data && Array.isArray(data[b.key]) ? (data[b.key] as unknown[]).length : null,
  }));

  return (
    <Container className="py-10">
      <PageHeader
        kicker="V7M · Coordenador"
        title="Revisões"
        subtitle="Tudo que está esperando uma decisão sua, num lugar só."
      />

      {errorCode ? (
        <Card className="text-muted-on-light">
          Não deu pra carregar a fila agora ({errorCode}). Atualize a página.
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {counts.map((b) => (
            <Card key={b.key}>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-base">{b.label}</h2>
                <span className="font-display text-2xl text-gold-ink">
                  {b.count ?? "—"}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-6 text-sm text-muted-on-light">
        As seções de decisão (Candidatos, Matrículas, Alunos, Promotores) entram nos
        próximos marcos. Por ora esta tela mostra a fila agregada.
      </p>
    </Container>
  );
}
