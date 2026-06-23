import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { CandidatoDetailBody } from "@/components/leadership/CandidatoDetailBody";
import { djangoFetch, DjangoError } from "@/lib/api/client";
import { LEADERSHIP } from "@/lib/api/leadership";

export const dynamic = "force-dynamic";
export const metadata = { title: "Candidato" };

// GET /leadership/candidates/{id} → objeto LIVRE (contrato não publicado no
// OpenAPI). O render defensivo vive em CandidatoDetailBody (presentational, dá
// pra ver no /dev-preview). Decisões (aprovar/rejeitar/decidir selfie+doc) são
// identidade/status reais → Portão com o Victor; aqui é só leitura.
export default async function CandidatoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let data: Record<string, unknown> | null = null;
  let errorCode: string | null = null;
  try {
    data = await djangoFetch<Record<string, unknown>>(`${LEADERSHIP}/candidates/${id}`);
  } catch (e) {
    errorCode = e instanceof DjangoError ? e.body.code : "ERROR";
  }

  const name = data && typeof data.name === "string" ? data.name : "Candidato";

  return (
    <Container className="py-10">
      <Link
        href="/coordenador/candidatos"
        className="inline-flex items-center min-h-11 text-sm text-muted-on-light hover:text-black transition-colors"
      >
        ← Candidatos
      </Link>

      <PageHeader kicker="V7M · Coordenador" title={name} />

      <CandidatoDetailBody data={data} errorCode={errorCode} />
    </Container>
  );
}
