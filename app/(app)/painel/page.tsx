import { redirect } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { pickFunnelRole, readSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

const PLACEHOLDER_LABEL: Record<string, string> = {
  candidate: "Candidato · começando o cadastro",
  training: "Trainee · em treinamento",
  promoter: "Promotor · painel completo",
  coordinator: "Coordenador · tela do coordenador (futuro)",
};

export default async function PainelPage() {
  const session = await readSession();
  if (!session) redirect("/entrar");
  const role = pickFunnelRole(session.roles);

  return (
    <GrainSection className="bg-paper-soft min-h-[60vh]">
      <Container>
        <p className="kicker text-gold-ink">V7M · Promotor</p>
        <h1 className="mb-3" style={{ fontSize: "var(--text-h2-sm)" }}>
          Olá, {session.name ?? "promotor"}
        </h1>
        <p className="text-muted-on-light text-lg mb-8">
          {role ? PLACEHOLDER_LABEL[role] ?? `Role: ${role}` : "Bem-vindo."}
        </p>
        <p className="text-sm text-muted-on-light max-w-prose">
          O seu dashboard entra nos próximos milestones (M2a em diante). Por ora,
          confirmamos o login fim-a-fim (auth + cookies HttpOnly + whoami do
          backend).
        </p>
      </Container>
    </GrainSection>
  );
}
