import { redirect } from "next/navigation";

import { FunnelStepper } from "@/components/ui/stepper";
import { CompactHeader, PageShell } from "@/components/layout/page-shell";
import { djangoFetch } from "@/lib/api/client";
import type { CandidateMe } from "@/lib/api/types";
import { candidateStageHref, FUNNEL_ORDER } from "@/lib/candidate/funnel";
import { readSession } from "@/lib/auth/server";

import { SelfieForm } from "./SelfieForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Última confirmação" };

type Contract = {
  version: string;
  text: string;
};

export default async function SelfiePage() {
  const session = await readSession();
  if (!session) redirect("/");
  if (!session.roles.includes("candidate")) redirect("/painel");

  // Etapa FUTURA (deep-link/aba velha): o back só aceita a selfie a partir da
  // escolaridade — antes disso a pessoa lia o acordo, tirava a selfie e SÓ
  // ENTÃO tomava 409. Vai direto pra etapa real.
  const me = await djangoFetch<CandidateMe>("/api/v1/collaborators/candidate/me");
  const contract = await djangoFetch<Contract>("/api/v1/collaborators/contract/current");
  const idx = FUNNEL_ORDER.indexOf(me.status);
  if (idx >= 0 && idx < FUNNEL_ORDER.indexOf("education")) {
    redirect(candidateStageHref(me));
  }
  const recoveryRoute = candidateStageHref(me);
  if (recoveryRoute !== "/selfie" && recoveryRoute !== "/painel") {
    redirect(recoveryRoute);
  }

  return (
    <PageShell>
      <CompactHeader
        kicker="V7M · Cadastro"
        title="Última confirmação"
        subtitle="Olhe para a câmera e tire uma foto. Leva poucos segundos e protege seu cadastro."
      />
      <FunnelStepper current="selfie" />
      <SelfieForm contractText={contract.text} contractVersion={contract.version} />
    </PageShell>
  );
}
