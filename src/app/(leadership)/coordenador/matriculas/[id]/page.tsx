import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/ui/page-header";
import { MatriculaDetailBody } from "@/components/leadership/MatriculaDetailBody";
import { MatriculaActions } from "@/components/leadership/MatriculaActions";
import { djangoFetch, DjangoError } from "@/lib/api/client";
import { LEADERSHIP, type EnrollmentDetail, type EnrollmentFees } from "@/lib/api/leadership";

export const dynamic = "force-dynamic";
export const metadata = { title: "Matrícula" };

// GET /leadership/enrollments/{id} → objeto LIVRE (OpenAPI sem schema por campo),
// mas o bloco `fees` é conhecido (`EnrollmentFeesOut`). Render: defesa pra
// primitivos/aninhados, e o bloco `fees` vai pro MatriculaActions com botões
// para fee/pay (1ª à vista), fee/schedule (2ª agendada) e conclude (cola
// login/senha da plataforma parceira → enrollment vira student). Mexe em R$ da
// empresa e credencial do aluno → confirmação em 2 passos no MatriculaActions.
export default async function MatriculaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let data: EnrollmentDetail | null = null;
  let errorCode: string | null = null;
  try {
    data = await djangoFetch<EnrollmentDetail>(`${LEADERSHIP}/enrollments/${id}`);
  } catch (e) {
    errorCode = e instanceof DjangoError ? e.body.code : "ERROR";
  }

  const name =
    data && typeof data.name === "string" ? (data.name as string) : "Matrícula";

  return (
    <Container className="py-10">
      <Link
        href="/coordenador/matriculas"
        className="inline-flex items-center min-h-11 text-sm text-brand-muted hover:text-brand-ink transition-colors"
      >
        ← Matrículas
      </Link>

      <PageHeader kicker="V7M · Coordenador" title={name} />

      <MatriculaDetailBody data={data} errorCode={errorCode} />

      {!errorCode && data && (
        <div className="mt-6">
          <MatriculaActions externalId={id} fees={(data.fees ?? null) as EnrollmentFees | null} />
        </div>
      )}
    </Container>
  );
}