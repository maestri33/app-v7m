import { redirect } from "next/navigation";
import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { pickFunnelRole, readSession } from "@/lib/auth/server";
import { djangoFetch } from "@/lib/api/client";
import type { CandidateMe, CandidateStatus, PromoterMe } from "@/lib/api/types";

export const dynamic = "force-dynamic";

const STAGE_LABEL: Record<CandidateStatus, string> = {
  STARTED: "Complete seu perfil",
  PROFILE: "Complete seu perfil",
  ADDRESS: "Complete seu endereço",
  DOCUMENTS: "Envie seu documento",
  PIX: "Cadastre sua chave Pix",
  SELFIE: "Tire sua selfie",
  COMPLETED: "Você virou trainee",
};

const STAGE_HREF: Record<CandidateStatus, string> = {
  STARTED: "/perfil",
  PROFILE: "/perfil",
  ADDRESS: "/endereco",
  DOCUMENTS: "/documento",
  PIX: "/pix",
  SELFIE: "/selfie",
  COMPLETED: "/treinamento",
};

const ROLE_LABEL: Record<string, string> = {
  candidate: "Candidato · começando o cadastro",
  training: "Trainee · em treinamento",
  promoter: "Promotor · painel completo",
  coordinator: "Coordenador · tela do coordenador (futuro)",
};

export default async function PainelPage() {
  const session = await readSession();
  if (!session) redirect("/entrar");
  const role = pickFunnelRole(session.roles);

  if (role === "candidate") {
    const me = await djangoFetch<CandidateMe>("/api/v1/collaborators/candidate/me");
    return (
      <GrainSection className="bg-paper-soft min-h-[60vh]">
        <Container>
          <p className="kicker text-gold-ink">V7M · Promotor</p>
          <h1 className="mb-3" style={{ fontSize: "var(--text-h2-sm)" }}>
            Olá, {session.name ?? "promotor"}
          </h1>
          <p className="text-muted-on-light text-lg mb-8">
            {STAGE_LABEL[me.status]}
          </p>

          <div className="grid gap-4 max-w-2xl md:grid-cols-2">
            <StageCard
              title="Perfil"
              done={!!me.profile?.marital_status && !!me.profile?.nationality}
              href="/perfil"
            />
            <StageCard
              title="Endereço"
              done={!!me.address?.zipcode && !!me.address?.city}
              href="/endereco"
            />
            <StageCard title="Documento" done={false} href="/documento" hint="Próxima etapa (M2b)" />
            <StageCard title="Pix" done={false} href="/pix" hint="Próxima etapa (M2c)" />
            <StageCard title="Selfie" done={false} href="/selfie" hint="Próxima etapa (M2c)" />
          </div>

          <div className="mt-10">
            <Link href={STAGE_HREF[me.status]} className="btn btn-xl inline-block">
              {me.status === "COMPLETED" ? "Ir pro treinamento" : "Continuar de onde parei"}
            </Link>
          </div>
        </Container>
      </GrainSection>
    );
  }

  if (role === "promoter") {
    const data = await djangoFetch<PromoterMe>("/api/v1/collaborators/promoter/me");
    return (
      <GrainSection className="bg-paper-soft min-h-[60vh]">
        <Container>
          <p className="kicker text-gold-ink">V7M · Promotor</p>
          <h1 className="mb-3" style={{ fontSize: "var(--text-h2-sm)" }}>
            Olá, {session.name ?? "promotor"}
          </h1>
          <p className="text-muted-on-light text-lg mb-2">
            {data.status === "active" ? "Ativo" : "Suspenso"}
            {data.hub_external_id ? ` · polo ${data.hub_external_id.slice(0, 8)}` : ""}
          </p>
          {data.ref_url && (
            <p className="text-sm text-muted-on-light mb-8">
              Seu link de captação: <code className="text-paper">{data.ref_url}</code>
            </p>
          )}

          <div className="grid gap-4 max-w-2xl md:grid-cols-2">
            <Link
              href="/leads"
              className="block rounded-[var(--radius)] border border-line-light/20 bg-white p-5 hover:border-gold transition"
            >
              <h2 className="font-display text-lg">Leads</h2>
              <p className="text-sm text-muted-on-light mt-1">
                Quem clicou no seu link e onde está.
              </p>
            </Link>
            <Link
              href="/comissoes"
              className="block rounded-[var(--radius)] border border-line-light/20 bg-white p-5 hover:border-gold transition"
            >
              <h2 className="font-display text-lg">Comissões</h2>
              <p className="text-sm text-muted-on-light mt-1">
                Pagas e pendentes. Atualiza depois do fechamento da semana.
              </p>
            </Link>
          </div>
        </Container>
      </GrainSection>
    );
  }

  if (role === "training") {
    return (
      <GrainSection className="bg-paper-soft min-h-[60vh]">
        <Container>
          <p className="kicker text-gold-ink">V7M · Promotor</p>
          <h1 className="mb-3" style={{ fontSize: "var(--text-h2-sm)" }}>
            Olá, {session.name ?? "trainee"}
          </h1>
          <p className="text-muted-on-light text-lg mb-8">
            Bora terminar o treinamento?
          </p>
          <Link href="/treinamento" className="btn btn-xl inline-block">
            Ver matérias
          </Link>
        </Container>
      </GrainSection>
    );
  }

  return (
    <GrainSection className="bg-paper-soft min-h-[60vh]">
      <Container>
        <p className="kicker text-gold-ink">V7M · Promotor</p>
        <h1 className="mb-3" style={{ fontSize: "var(--text-h2-sm)" }}>
          Olá, {session.name ?? "promotor"}
        </h1>
        <p className="text-muted-on-light text-lg mb-8">
          {role ? ROLE_LABEL[role] ?? `Role: ${role}` : "Bem-vindo."}
        </p>
        <p className="text-sm text-muted-on-light max-w-prose">
          O seu dashboard entra nos próximos milestones (M3 em diante). Por ora,
          confirmamos o login fim-a-fim (auth + cookies HttpOnly + whoami do
          backend).
        </p>
      </Container>
    </GrainSection>
  );
}

function StageCard({
  title,
  done,
  href,
  hint,
}: {
  title: string;
  done: boolean;
  href: string;
  hint?: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-[var(--radius)] border border-line-light/20 bg-white p-5 hover:border-gold transition"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg">{title}</h2>
        <span
          className={`text-xs uppercase tracking-wider ${
            done ? "text-green-700" : "text-muted-on-light"
          }`}
        >
          {done ? "OK" : "Pendente"}
        </span>
      </div>
      {hint && <p className="text-xs text-muted-on-light mt-1">{hint}</p>}
    </Link>
  );
}
