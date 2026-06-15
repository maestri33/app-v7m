import { redirect } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { djangoFetch } from "@/lib/api/client";
import type { CandidateMe } from "@/lib/api/types";
import { readSession } from "@/lib/auth/server";

import { PixForm } from "./PixForm";

export const dynamic = "force-dynamic";

type PixSection = {
  key?: string | null;
  key_type?: string | null;
  validated_at?: string | null;
};

export default async function PixPage() {
  const session = await readSession();
  if (!session) redirect("/entrar");
  if (!session.roles.includes("candidate")) redirect("/painel");

  const me = await djangoFetch<CandidateMe>("/api/v1/collaborators/candidate/me");
  const profile = me.profile;
  const cpf = profile?.nationality && profile.birth_date ? "" : ""; // preenchido pelo form se vazio
  void cpf; // hint visual
  // `selfie` aqui não é o que queremos — Pix fica em outro lugar. Fallback: vazio.
  const initial: PixSection = {};

  return (
    <GrainSection className="bg-paper-soft min-h-[60vh]">
      <Container>
        <p className="kicker text-gold-ink">V7M · Promotor</p>
        <h1 className="mb-3" style={{ fontSize: "var(--text-h2-sm)" }}>
          Sua chave Pix
        </h1>
        <p className="text-muted-on-light mb-8">
          A chave precisa ser SUA e do mesmo CPF do cadastro. A gente valida
          no DICT (Asaas) conferindo o titular — isso mexe R$0,01 de verdade.
        </p>
        <div className="max-w-xl">
          <PixForm initial={initial} />
        </div>
      </Container>
    </GrainSection>
  );
}
