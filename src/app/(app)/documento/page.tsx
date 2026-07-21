import { redirect } from "next/navigation";

import { FunnelStepper } from "@/components/ui/stepper";
import { CompactHeader, PageShell } from "@/components/layout/page-shell";
import { djangoFetch } from "@/lib/api/client";
import type { CandidateMe, DocumentSection } from "@/lib/api/types";
import {
  candidateStageHref,
  documentSectionCaptured,
} from "@/lib/candidate/funnel";
import { readSession } from "@/lib/auth/server";

import { DocForm } from "./DocForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Seu documento" };

export default async function DocumentoPage() {
  const session = await readSession();
  if (!session) redirect("/");
  if (!session.roles.includes("candidate")) redirect("/painel");

  const [me, doc] = await Promise.all([
    djangoFetch<CandidateMe>("/api/v1/collaborators/candidate/me"),
    djangoFetch<DocumentSection>("/api/v1/collaborators/candidate/document").catch(
      () => ({}) as DocumentSection,
    ),
  ]);

  const target = candidateStageHref(me);
  if (documentSectionCaptured(doc) && target !== "/documento") redirect(target);

  return (
    <PageShell>
      <CompactHeader
        kicker="V7M · Cadastro"
        title="Seu documento"
        subtitle="Escolha RG ou CNH. A gente confirma se a foto é de um documento e segue; leitura e conferências continuam em segundo plano."
      />
      <FunnelStepper current="documents" />
      <div className="auth-card">
        <DocForm initial={doc} />
      </div>
    </PageShell>
  );
}
