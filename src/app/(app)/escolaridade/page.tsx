import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FunnelStepper } from "@/components/ui/stepper";
import { CompactHeader, PageShell } from "@/components/layout/page-shell";
import { djangoFetch } from "@/lib/api/client";
import type { CandidateMe } from "@/lib/api/types";
import { candidateStageHref, stageCompleted } from "@/lib/candidate/funnel";
import { readSession } from "@/lib/auth/server";

import { EscolaridadeForm } from "./EscolaridadeForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Escolaridade" };

export default async function EscolaridadePage() {
  const session = await readSession();
  if (!session) redirect("/");
  if (!session.roles.includes("candidate")) redirect("/painel");

  const me = await djangoFetch<CandidateMe>("/api/v1/collaborators/candidate/me");
  const educationComplete = stageCompleted("education", me);
  const target = candidateStageHref(me);
  if (!educationComplete && target !== "/escolaridade") redirect(target);

  // Escolaridade já gravada (etapa passou) → resumo sem form.
  if (educationComplete) {
    return (
      <PageShell>
        <CompactHeader kicker="V7M · Cadastro" title="Escolaridade" />
        <FunnelStepper current={me.status} />
        <div className="auth-card space-y-5">
          <div className="banner banner-ok" role="status">
            <p className="font-display">Escolaridade registrada ✓</p>
            <p className="text-sm mt-1 opacity-90">
              Guardamos seu nível de ensino. Falta só a selfie pra fechar o
              cadastro.
            </p>
          </div>
          <Button href={candidateStageHref(me)} size="xl" className="w-full">
            Continuar
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <CompactHeader
        kicker="V7M · Cadastro"
        title="Escolaridade"
        subtitle="Informe a última série, se concluiu ou parou no meio e em que ano. Cidade e escola são opcionais."
      />
      <FunnelStepper current="education" />
      <div className="auth-card">
        <EscolaridadeForm />
      </div>
    </PageShell>
  );
}
