import { redirect } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { FunnelStepper } from "@/components/ui/stepper";
import { djangoFetch } from "@/lib/api/client";
import type { CandidateMe } from "@/lib/api/types";
import { STAGE_HREF, stagePassed } from "@/lib/candidate/funnel";
import { maskPixKey } from "@/lib/format";
import { readSession } from "@/lib/auth/server";

import { PixForm } from "./PixForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sua chave Pix" };

export default async function PixPage() {
  const session = await readSession();
  if (!session) redirect("/");
  if (!session.roles.includes("candidate")) redirect("/painel");

  const me = await djangoFetch<CandidateMe>("/api/v1/collaborators/candidate/me");

  // Chave já validada (etapa passou) → resumo mascarado, sem form. Validar de
  // novo mexeria R$0,01 no DICT à toa.
  if (stagePassed("pix", me.status)) {
    const key = me.pix?.key ?? null;
    return (
      <GrainSection className="bg-brand-bg min-h-[60dvh]">
        <Container>
          <PageHeader title="Chave Pix" subtitle="Etapa concluída." />
          <FunnelStepper current={me.status} />
          <Card className="max-w-xl space-y-5">
            <div className="banner banner-ok" role="status">
              <p className="font-display">Chave validada ✓</p>
              <p className="text-sm mt-1 opacity-90">
                {key ? `${maskPixKey(key)} · ` : ""}titular confere no DICT. É pra
                essa chave que as suas comissões vão.
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
    <GrainSection className="bg-brand-bg min-h-[60dvh]">
      <Container>
        <PageHeader
          title="Chave Pix"
          subtitle="É pra onde vão suas comissões. Cole ou digite sua chave — a gente reconhece o tipo sozinho e confere no DICT."
        />
        <FunnelStepper current="pix" />
        <Card className="max-w-xl">
          <PixForm />
        </Card>
      </Container>
    </GrainSection>
  );
}
