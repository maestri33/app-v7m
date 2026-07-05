import { redirect } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ReadOnlyField } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { FunnelStepper } from "@/components/ui/stepper";
import { djangoFetch } from "@/lib/api/client";
import type { CandidateMe, DocumentSection } from "@/lib/api/types";
import { STAGE_HREF, stagePassed } from "@/lib/candidate/funnel";
import { readSession } from "@/lib/auth/server";

import { DocForm } from "./DocForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Seu documento" };

export default async function DocumentoPage() {
  const session = await readSession();
  if (!session) redirect("/");
  if (!session.roles.includes("candidate")) redirect("/painel");

  const me = await djangoFetch<CandidateMe>("/api/v1/collaborators/candidate/me");
  const doc: DocumentSection = me.documents ?? {};

  // Etapa já concluída → resumo somente-leitura + CTA pro passo atual.
  if (stagePassed("documents", me.status)) {
    return (
      <GrainSection className="bg-brand-bg min-h-[60dvh]">
        <Container>
          <PageHeader title="Seu documento" subtitle="Etapa concluída." />
          <FunnelStepper current={me.status} />
          <Card className="max-w-xl space-y-5">
            <div className="banner banner-ok" role="status">
              <p className="font-display">Documento verificado ✓</p>
            </div>
            <ReadOnlyField
              label="Tipo"
              value={doc.doc_type ? doc.doc_type.toUpperCase() : "—"}
            />
            {doc.number != null && (
              <ReadOnlyField label="Número" value={String(doc.number)} />
            )}
            {doc.issuing_agency != null && doc.issuing_agency !== "" && (
              <ReadOnlyField label="Órgão emissor" value={String(doc.issuing_agency)} />
            )}
            <Button href={STAGE_HREF[me.status]} size="xl" className="w-full">
              Continuar
            </Button>
          </Card>
        </Container>
      </GrainSection>
    );
  }

  const initial: DocumentSection = {
    doc_type: doc.doc_type,
    number: doc.number,
    issuing_agency: doc.issuing_agency ?? undefined,
    analysis_status: doc.analysis_status ?? "pending",
    analysis_reason: doc.analysis_reason ?? null,
    missing_fields: doc.missing_fields ?? [],
    has_front: doc.has_front,
    has_back: doc.has_back,
    has_full: doc.has_full,
  };

  return (
    <GrainSection className="bg-brand-bg min-h-[60dvh]">
      <Container>
        <PageHeader
          title="Seu documento"
          subtitle="RG ou CNH. Tire uma foto ou envie um arquivo — nossa IA já lê e preenche os dados."
        />
        <FunnelStepper current="documents" />
        <Card className="max-w-xl">
          <DocForm initial={initial} />
        </Card>
      </Container>
    </GrainSection>
  );
}
