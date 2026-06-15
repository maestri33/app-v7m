import { redirect } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { djangoFetch } from "@/lib/api/client";
import type { CandidateMe, DocumentSection } from "@/lib/api/types";
import { readSession } from "@/lib/auth/server";

import { DocForm } from "./DocForm";

export const dynamic = "force-dynamic";

export default async function DocumentoPage() {
  const session = await readSession();
  if (!session) redirect("/entrar");
  if (!session.roles.includes("candidate")) redirect("/painel");

  const me = await djangoFetch<CandidateMe>("/api/v1/collaborators/candidate/me");
  const doc: DocumentSection = me.documents ?? {};
  const initial: DocumentSection = {
    doc_type: doc.doc_type,
    number: doc.number,
    issuing_agency: doc.issuing_agency ?? undefined,
    analysis_status: doc.analysis_status ?? "pending",
    analysis_reason: doc.analysis_reason ?? null,
    missing_fields: doc.missing_fields ?? [],
  };

  return (
    <GrainSection className="bg-paper-soft min-h-[60vh]">
      <Container>
        <p className="kicker text-gold-ink">V7M · Promotor</p>
        <h1 className="mb-3" style={{ fontSize: "var(--text-h2-sm)" }}>
          Seu documento
        </h1>
        <p className="text-muted-on-light mb-8">
          RG ou CNH, com foto. A IA confere o tipo, a legibilidade e a sua
          identidade pelo CPFHub. Se reprovar, reenvie. Se o coordenador
          ficar em dúvida, ele decide.
        </p>
        <div className="max-w-xl">
          <DocForm initial={initial} initialStatus={me.status} />
        </div>
      </Container>
    </GrainSection>
  );
}
