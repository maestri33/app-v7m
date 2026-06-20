import { redirect } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { FunnelStepper } from "@/components/ui/Stepper";
import { djangoFetch } from "@/lib/api/client";
import type { CandidateMe, ProfileSection } from "@/lib/api/types";
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

  return (
    <GrainSection className="bg-paper-soft min-h-[60dvh]">
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
