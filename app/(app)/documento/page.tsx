import { redirect } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { FunnelStepper } from "@/components/ui/Stepper";
import { djangoFetch } from "@/lib/api/client";
import type { CandidateMe, DocumentSection } from "@/lib/api/types";
import { readSession } from "@/lib/auth/server";

import { DocForm } from "./DocForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Seu documento" };

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
        <PageHeader
          title="Seu documento"
          subtitle="RG ou CNH, com foto. A IA confere o tipo, a legibilidade e a sua identidade pelo CPFHub. Se reprovar, reenvie. Se o coordenador ficar em dúvida, ele decide."
        />
        <FunnelStepper current="documents" />
        <Card className="max-w-xl">
          <DocForm initial={initial} initialStatus={me.status} />
        </Card>
      </Container>
    </GrainSection>
  );
}
