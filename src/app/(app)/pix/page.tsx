import { redirect } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { FunnelStepper } from "@/components/ui/stepper";
import { djangoFetch } from "@/lib/api/client";
import type { CandidateMe } from "@/lib/api/types";
import { FUNNEL_ORDER, stageHref, STAGE_HREF, stagePassed } from "@/lib/candidate/funnel";
import { readSession } from "@/lib/auth/server";

import { PixForm } from "./PixForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sua chave Pix" };

export default async function PixPage() {
  const session = await readSession();
  if (!session) redirect("/");
  if (!session.roles.includes("candidate")) redirect("/painel");

  const me = await djangoFetch<CandidateMe>("/api/v1/collaborators/candidate/me");

  // Etapa FUTURA (deep-link/aba velha): sem o documento aprovado, o submit da
  // chave só renderia 409 depois do esforço. Vai direto pra etapa real.
  const idx = FUNNEL_ORDER.indexOf(me.status);
  if (idx >= 0 && idx < FUNNEL_ORDER.indexOf("pix")) {
    redirect(stageHref(me.status));
  }

  // Chave já validada (etapa passou) → resumo sem form. A chave em si não vem
  // no contrato (P2.1); revalidar mexeria R$0,01 no DICT à toa.
  if (stagePassed("pix", me.status)) {
    return (
      <GrainSection className="bg-[var(--bg)] min-h-[60dvh]">
        <Container>
          <PageHeader title="Chave Pix" subtitle="Etapa concluída." />
          <FunnelStepper current={me.status} />
          <Card className="max-w-xl space-y-5">
            <div className="banner banner-ok" role="status">
              <p className="font-display">Chave validada ✓</p>
              <p className="text-sm mt-1 opacity-90">
                Confirmada no seu nome. É pra essa chave que as suas comissões
                vão, toda sexta.
              </p>
            </div>
            <Button href={STAGE_HREF[me.status]} size="xl" className="w-full">
              Continuar
            </Button>
          </Card>
        </Container>
      </GrainSection>
    );
  }

  return (
    <GrainSection className="bg-[var(--bg)] min-h-[60dvh]">
      <Container>
        <PageHeader
          title="Chave Pix"
          subtitle="É pra onde vão suas comissões. Cole ou digite sua chave — a gente reconhece o tipo sozinho e confirma que ela é sua."
        />
        <FunnelStepper current="pix" />
        <Card className="max-w-xl">
          <PixForm />
        </Card>
      </Container>
    </GrainSection>
  );
}
