import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { djangoFetch, DjangoError } from "@/lib/api/client";
import { LEADERSHIP, type ReviewItem, type ReviewsOut } from "@/lib/api/leadership";

export const dynamic = "force-dynamic";
export const metadata = { title: "Revisões" };

/**
 * Baldes reais de GET /leadership/reviews (ReviewsOut, api/leadership.py): 7 listas
 * de ReviewItemOut homogêneo (external_id + type + kind + extras). Cada item agora é
 * CLICÁVEL — roteia por `type` (+ `kind`) pro workspace certo e linka por
 * `external_id`. Render defensivo: item sem destino conhecido vira cartão não
 * clicável (nunca some da fila).
 */
const BUCKETS: { key: keyof ReviewsOut; label: string }[] = [
  { key: "candidates_awaiting_approval", label: "Candidatos aguardando aprovação" },
  { key: "candidate_document", label: "Documentos de candidato em revisão" },
  { key: "candidate_selfie", label: "Selfies de candidato em revisão" },
  { key: "enrollment_rg", label: "RGs de matrícula em revisão" },
  { key: "enrollment_selfie", label: "Selfies de matrícula em revisão" },
  { key: "student_documents", label: "Documentos de aluno em revisão" },
  { key: "locked_promoters", label: "Promotores travados no treinamento" },
];

/**
 * Para onde cada item leva, por `type` (+ `kind`). O par student+documento usa
 * `student_external_id` (o `external_id` do item é o do documento, não do aluno).
 * locked_promoters não tem workspace por id → cai na lista de promotores. `null`
 * = sem destino conhecido (render não clicável, defensivo).
 */
function hrefFor(item: ReviewItem): string | null {
  switch (item.type) {
    case "enrollment":
      return `/coordenador/matriculas/${item.external_id}`;
    case "candidate":
      return `/coordenador/candidatos/${item.external_id}`;
    case "student":
      // external_id aqui é o do documento; o aluno é o student_external_id.
      return item.student_external_id
        ? `/coordenador/alunos/${item.student_external_id}`
        : null;
    case "promoter":
      return "/coordenador/promotores";
    default:
      return null;
  }
}

function sinceLabel(since: string | null | undefined): string | null {
  if (!since) return null;
  const d = new Date(since);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR");
}

function ReviewRow({ item }: { item: ReviewItem }) {
  const href = hrefFor(item);
  const since = sinceLabel(item.since);
  const inner = (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-brand-ink">{item.name ?? "Sem nome"}</p>
        <p className="text-xs text-brand-muted mt-0.5">
          {item.doc_type ? `${item.doc_type} · ` : ""}
          {since ? `desde ${since}` : item.kind}
        </p>
      </div>
      {item.rejected ? (
        <Badge tone="danger">Rejeitado</Badge>
      ) : (
        <Badge tone="warn">Pendente</Badge>
      )}
    </div>
  );

  if (!href) {
    return <div className="rounded-lg border border-brand-border px-3 py-2">{inner}</div>;
  }
  return (
    <Link
      href={href}
      className="block rounded-lg border border-brand-border px-3 py-2 hover:border-brand-gold-ink transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold-ink/40"
    >
      {inner}
    </Link>
  );
}

export default async function RevisoesPage() {
  let data: ReviewsOut | null = null;
  let errorCode: string | null = null;
  try {
    data = await djangoFetch<ReviewsOut>(`${LEADERSHIP}/reviews`);
  } catch (e) {
    errorCode = e instanceof DjangoError ? e.body.code : "ERROR";
  }

  const buckets = BUCKETS.map((b) => ({
    ...b,
    items: data && Array.isArray(data[b.key]) ? data[b.key] : [],
  }));
  const total = buckets.reduce((acc, b) => acc + b.items.length, 0);

  return (
    <Container className="py-10">
      <PageHeader
        kicker="V7M · Coordenador"
        title="Revisões"
        subtitle="Tudo que está esperando uma decisão sua, num lugar só. Clique num item pra abrir o workspace."
      />

      {errorCode ? (
        <Card className="text-brand-muted">
          Não deu pra carregar a fila agora ({errorCode}). Atualize a página.
        </Card>
      ) : total === 0 ? (
        <Card className="text-brand-muted">
          Nada na fila. Tudo em dia no seu polo.
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {buckets.map((b) => (
            <Card key={b.key}>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-base">{b.label}</h2>
                <span className="font-display text-2xl text-brand-gold-ink">
                  {b.items.length}
                </span>
              </div>
              {b.items.length > 0 && (
                <ul className="mt-3 grid gap-2">
                  {b.items.map((item, i) => (
                    <li key={`${item.external_id}-${i}`}>
                      <ReviewRow item={item} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}

      <p className="mt-6 text-sm text-brand-muted">
        Cada item abre o workspace da seção certa (Candidatos, Matrículas, Alunos ou
        Promotores), onde você toma a decisão. Promotores travados no treino caem na
        lista de Promotores, onde dá pra aprovar a matéria em aberto.
      </p>
    </Container>
  );
}
