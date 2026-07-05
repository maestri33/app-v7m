import { redirect } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ReadOnlyField } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { FunnelStepper } from "@/components/ui/stepper";
import { djangoFetch } from "@/lib/api/client";
import type { CandidateMe, ProfileSection } from "@/lib/api/types";
import { STAGE_HREF, stagePassed } from "@/lib/candidate/funnel";
import { maritalLabel } from "@/lib/candidate/labels";
import { formatDateBR } from "@/lib/format";
import { readSession } from "@/lib/auth/server";

import { PerfilForm } from "./PerfilForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Seu perfil" };

export default async function PerfilPage() {
  const session = await readSession();
  if (!session) redirect("/");
  if (!session.roles.includes("candidate")) redirect("/painel");

  const me = await djangoFetch<CandidateMe>("/api/v1/collaborators/candidate/me");
  const initial: ProfileSection = me.profile ?? {
    mother_name: null,
    father_name: null,
    birthplace: null,
    marital_status: null,
    nationality: null,
    name: session.name,
    birth_date: null,
  };

  // Etapa já concluída → resumo somente-leitura (só reabriria se o back
  // reprovasse; perfil não tem análise) + CTA pro passo atual.
  if (stagePassed("profile", me.status)) {
    return (
      <GrainSection className="bg-brand-bg min-h-[60dvh]">
        <Container>
          <PageHeader title="Seu perfil" subtitle="Etapa concluída." />
          <FunnelStepper current={me.status} />
          <Card className="max-w-xl space-y-5">
            <div className="banner banner-ok" role="status">
              <p className="font-display">Perfil confirmado ✓</p>
            </div>
            <ReadOnlyField label="Nome" value={initial.name ?? "—"} />
            <ReadOnlyField
              label="Data de nascimento"
              value={formatDateBR(initial.birth_date)}
              hint="Confirmado pelo CPF, não editável."
            />
            <ReadOnlyField label="Nome da mãe" value={initial.mother_name ?? "—"} />
            <ReadOnlyField label="Nome do pai" value={initial.father_name ?? "—"} />
            <ReadOnlyField label="Naturalidade" value={initial.birthplace ?? "—"} />
            <ReadOnlyField label="Estado civil" value={maritalLabel(initial.marital_status)} />
            <ReadOnlyField label="Nacionalidade" value={initial.nationality ?? "—"} />
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
          title="Seu perfil"
          subtitle="Estado civil, nacionalidade e filiação. O resto vem da extração do seu documento (próxima etapa)."
        />
        <FunnelStepper current="profile" />
        <Card className="max-w-xl">
          <PerfilForm initial={initial} />
        </Card>
      </Container>
    </GrainSection>
  );
}
