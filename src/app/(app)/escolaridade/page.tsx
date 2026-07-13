import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FunnelStepper } from "@/components/ui/stepper";
import { CompactHeader, PageShell } from "@/components/layout/page-shell";
import { djangoFetch } from "@/lib/api/client";
import type { CandidateMe } from "@/lib/api/types";
import { STAGE_HREF, stagePassed } from "@/lib/candidate/funnel";
import { readSession } from "@/lib/auth/server";

import { EscolaridadeForm } from "./EscolaridadeForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Escolaridade" };

export default async function EscolaridadePage() {
  const session = await readSession();
  if (!session) redirect("/");
  if (!session.roles.includes("candidate")) redirect("/painel");

  const me = await djangoFetch<CandidateMe>("/api/v1/collaborators/candidate/me");

  // Escolaridade já gravada (etapa passou) → resumo sem form.
  if (stagePassed("education", me.status)) {
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
          <Button href={STAGE_HREF[me.status]} size="xl" className="w-full">
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
        subtitle="Última pergunta antes da selfie: até onde você estudou? Não precisa ter concluído — é só pra gente te orientar direito."
      />
      <FunnelStepper current="education" />
      <div className="auth-card">
        <EscolaridadeForm />
      </div>
    </PageShell>
  );
}
