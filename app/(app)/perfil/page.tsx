import { redirect } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { djangoFetch } from "@/lib/api/client";
import type { CandidateMe, ProfileSection } from "@/lib/api/types";
import { readSession } from "@/lib/auth/server";

import { PerfilForm } from "./PerfilForm";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const session = await readSession();
  if (!session) redirect("/entrar");
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
    <GrainSection className="bg-paper-soft min-h-[60vh]">
      <Container>
        <p className="kicker text-gold-ink">V7M · Promotor</p>
        <h1 className="mb-3" style={{ fontSize: "var(--text-h2-sm)" }}>
          Seu perfil
        </h1>
        <p className="text-muted-on-light mb-8">
          Estado civil, nacionalidade e filiação. O resto vem da extração do seu documento
          (próxima etapa).
        </p>
        <div className="max-w-xl">
          <PerfilForm initial={initial} />
        </div>
      </Container>
    </GrainSection>
  );
}
