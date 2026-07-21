import { redirect } from "next/navigation";

import { FunnelStepper } from "@/components/ui/stepper";
import { ReadOnlyField } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { CompactHeader, PageShell } from "@/components/layout/page-shell";
import { djangoFetch } from "@/lib/api/client";
import type { CandidateMe, DocumentSection } from "@/lib/api/types";
import { candidateStageHref, stageCompleted } from "@/lib/candidate/funnel";
import { readSession } from "@/lib/auth/server";

import { DocForm } from "./DocForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Seu documento" };

export default async function DocumentoPage() {
  const session = await readSession();
  if (!session) redirect("/");
  if (!session.roles.includes("candidate")) redirect("/painel");

  // `candidate/me` dá o status do funil; a seção RICA do documento (doc_type,
  // número, análise) vem do endpoint dedicado — no me_dict ela é bloco por tipo.
  const [me, doc] = await Promise.all([
    djangoFetch<CandidateMe>("/api/v1/collaborators/candidate/me"),
    djangoFetch<DocumentSection>("/api/v1/collaborators/candidate/document").catch(
      () => ({}) as DocumentSection,
    ),
  ]);

  // Gate de etapa FUTURA: sem comprovante aprovado o back ainda está em
  // `profile` — deep-link/botão voltar caía aqui, a pessoa fotografava o RG e
  // só então tomava 409. Manda direto pra etapa real.
  if (me.status === "profile" || me.status === "started") {
    redirect(candidateStageHref(me));
  }

  // Etapa já concluída → resumo somente-leitura + CTA pro passo atual.
  if (stageCompleted("documents", me)) {
    return (
      <PageShell>
        <CompactHeader kicker="V7M · Cadastro" title="Seu documento" />
        <FunnelStepper current={me.status} />
        <div className="auth-card space-y-5">
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
          <Button href={candidateStageHref(me)} size="xl" className="w-full">
            Continuar
          </Button>
        </div>
      </PageShell>
    );
  }

  const initial: DocumentSection = {
    doc_type: doc.doc_type,
    number: doc.number,
    issuing_agency: doc.issuing_agency ?? undefined,
    analysis_status: doc.analysis_status,
    analysis_reason: doc.analysis_reason ?? null,
    missing_fields: doc.missing_fields ?? [],
    has_front: doc.has_front,
    has_back: doc.has_back,
    has_full: doc.has_full,
    next_slot: doc.next_slot ?? null,
    photos: doc.photos ?? undefined,
  };

  return (
    <PageShell>
      <CompactHeader
        kicker="V7M · Cadastro"
        title="Seu documento"
        subtitle="RG ou CNH. Tire uma foto ou envie um arquivo — nossa IA já lê e preenche os dados."
      />
      <FunnelStepper current="documents" />
      <div className="auth-card">
        <DocForm initial={initial} />
      </div>
    </PageShell>
  );
}
