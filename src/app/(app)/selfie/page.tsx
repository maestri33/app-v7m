import { redirect } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { FunnelStepper } from "@/components/ui/stepper";
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

  return (
    <GrainSection className="bg-brand-bg min-h-[60dvh]">
      <Container>
        <PageHeader
          title="Sua selfie"
          subtitle="Foto ao vivo, sem óculos escuros. A IA confere a vivacidade e compara com o rosto do documento. Se reprovar, ela te explica como refazer."
        />
        <FunnelStepper current="selfie" />
        <Card className="max-w-xl">
          <SelfieForm />
        </Card>
      </Container>
    </GrainSection>
  );
}
