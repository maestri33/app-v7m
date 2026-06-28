import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/ui/page-header";
import { CandidatoDetailBody } from "@/components/leadership/CandidatoDetailBody";
import { CandidatoActions } from "@/components/leadership/CandidatoActions";
import { djangoFetch, DjangoError } from "@/lib/api/client";
import { LEADERSHIP, type CandidateDetail } from "@/lib/api/leadership";

export const dynamic = "force-dynamic";
export const metadata = { title: "Candidato" };

// GET /leadership/candidates/{id} → CandidateDetailOut (TIPADO no OpenAPI vivo
// 2026-06-23). O render vive em CandidatoDetailBody (presentational, dá pra ver no
// /dev-preview). As decisões (aprovar/rejeitar/selfie/documento) vivem no
// CandidatoActions, que posta nos route handlers com cookie.
export default async function CandidatoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let data: CandidateDetail | null = null;
  let errorCode: string | null = null;
  try {
    data = await djangoFetch<CandidateDetail>(`${LEADERSHIP}/candidates/${id}`);
  } catch (e) {
    errorCode = e instanceof DjangoError ? e.body.code : "ERROR";
  }

  const name =
    data && typeof data.user?.name === "string" ? data.user.name : "Candidato";

  return (
    <Container className="py-10">
      <Link
        href="/coordenador/candidatos"
        className="inline-flex items-center min-h-11 text-sm text-brand-muted hover:text-brand-ink transition-colors"
      >
        ← Candidatos
      </Link>

      <PageHeader kicker="V7M · Coordenador" title={name} />

      <CandidatoDetailBody data={data} errorCode={errorCode} />

      {!errorCode && data && <CandidatoActions externalId={id} detail={data} />}
    </Container>
  );
}
