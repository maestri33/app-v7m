import { redirect } from "next/navigation";

import { FunnelStepper } from "@/components/ui/stepper";
import { CompactHeader, PageShell } from "@/components/layout/page-shell";
import { djangoFetch } from "@/lib/api/client";
import type { CandidateMe } from "@/lib/api/types";
import { FUNNEL_ORDER, stageHref } from "@/lib/candidate/funnel";
import { readSession } from "@/lib/auth/server";

import { SelfieForm } from "./SelfieForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sua selfie" };

export default async function SelfiePage() {
  const session = await readSession();
  if (!session) redirect("/");
  if (!session.roles.includes("candidate")) redirect("/painel");

  // Etapa FUTURA (deep-link/aba velha): o back só aceita a selfie a partir da
  // escolaridade — antes disso a pessoa lia o acordo, tirava a selfie e SÓ
  // ENTÃO tomava 409. Vai direto pra etapa real.
  const me = await djangoFetch<CandidateMe>("/api/v1/collaborators/candidate/me");
  const idx = FUNNEL_ORDER.indexOf(me.status);
  if (idx >= 0 && idx < FUNNEL_ORDER.indexOf("education")) {
    redirect(stageHref(me.status));
  }
  // Selfie é a última etapa: se o funil já passou dela (selfie aprovada →
  // completed, ou decisão do polo → approved/rejected), forwarda pro painel em
  // vez de mostrar o uploader de novo. É o par server-side do refresh do
  // SelfieForm — juntos evitam o ping-pong selfie⇄painel.
  if (me.status === "completed" || me.status === "approved" || me.status === "rejected") {
    redirect("/painel");
  }

  return (
    <PageShell>
      <CompactHeader
        kicker="V7M · Cadastro"
        title="Sua selfie"
        subtitle="Foto ao vivo, sem óculos escuros. A IA confere a vivacidade e compara com o rosto do documento. Se reprovar, ela te explica como refazer."
      />
      <FunnelStepper current="selfie" />
      <div className="auth-card">
        <SelfieForm />
      </div>
    </PageShell>
  );
}
