import { redirect } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CardLink } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { pickFunnelRole, readSession } from "@/lib/auth/server";
import { djangoFetch } from "@/lib/api/client";
import type { CandidateMe, CandidateStatus, PromoterMe } from "@/lib/api/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "Painel" };

// Ordem do funil (mesma do backend) — usada pra saber quais etapas já passaram.
const FUNNEL_ORDER: CandidateStatus[] = [
  "started",
  "profile",
  "address",
  "documents",
  "pix",
  "selfie",
  "completed",
];

const CANDIDATE_STAGES = [
  { key: "profile", title: "Perfil", href: "/perfil" },
  { key: "address", title: "Endereço", href: "/endereco" },
  { key: "documents", title: "Documento", href: "/documento" },
  { key: "pix", title: "Pix", href: "/pix" },
  { key: "selfie", title: "Selfie", href: "/selfie" },
] as const;

function cardState(
  stage: CandidateStatus,
  current: CandidateStatus,
): "done" | "current" | "todo" {
  const ci = FUNNEL_ORDER.indexOf(current);
  const si = FUNNEL_ORDER.indexOf(stage);
  if (ci > si) return "done";
  if (ci === si) return "current";
  return "todo";
}

const STAGE_LABEL: Record<CandidateStatus, string> = {
  started: "Complete seu perfil",
  profile: "Complete seu perfil",
  address: "Complete seu endereço",
  documents: "Envie seu documento",
  pix: "Cadastre sua chave Pix",
  selfie: "Tire sua selfie",
  completed: "Você virou trainee",
};

const STAGE_HREF: Record<CandidateStatus, string> = {
  started: "/perfil",
  profile: "/perfil",
  address: "/endereco",
  documents: "/documento",
  pix: "/pix",
  selfie: "/selfie",
  completed: "/treinamento",
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
    const current: CandidateStatus = me.status === "started" ? "profile" : me.status;
    return (
      <GrainSection className="bg-paper-soft min-h-[60dvh]">
        <Container>
          <PageHeader
            title={`Olá, ${session.name ?? "promotor"}`}
            subtitle={STAGE_LABEL[me.status]}
          />

          <div className="grid gap-4 max-w-2xl md:grid-cols-2">
            {CANDIDATE_STAGES.map((s) => (
              <StageCard
                key={s.key}
                title={s.title}
                href={s.href}
                state={cardState(s.key, current)}
              />
            ))}
          </div>

          <div className="mt-10">
            <Button href={STAGE_HREF[me.status]} size="xl">
              {me.status === "completed" ? "Ir pro treinamento" : "Continuar de onde parei"}
            </Button>
          </div>
        </Container>
      </GrainSection>
    );
  }

  if (role === "promoter") {
    const data = await djangoFetch<PromoterMe>("/api/v1/collaborators/promoter/me");
    return (
      <GrainSection className="bg-paper-soft min-h-[60dvh]">
        <Container>
          <PageHeader
            title={`Olá, ${session.name ?? "promotor"}`}
            subtitle={
              <span className="inline-flex items-center gap-2">
                <Badge tone={data.status === "active" ? "ok" : "danger"}>
                  {data.status === "active" ? "Ativo" : "Suspenso"}
                </Badge>
                {data.hub_external_id
                  ? `polo ${data.hub_external_id.slice(0, 8)}`
                  : ""}
              </span>
            }
          />
          {data.ref_url && (
            <div className="-mt-4 mb-8 max-w-2xl">
              <p className="text-sm text-muted-on-light mb-1">Seu link de captação</p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="rounded bg-paper px-2 py-1 border border-line-light text-black text-sm break-all">
                  {data.ref_url}
                </code>
                <CopyButton value={data.ref_url} label="Copiar link" />
              </div>
            </div>
          )}

          <div className="grid gap-4 max-w-2xl md:grid-cols-2">
            <CardLink href="/leads">
              <h2 className="font-display text-lg">Leads</h2>
              <p className="text-sm text-muted-on-light mt-1">
                Quem clicou no seu link e onde está.
              </p>
            </CardLink>
            <CardLink href="/comissoes">
              <h2 className="font-display text-lg">Comissões</h2>
              <p className="text-sm text-muted-on-light mt-1">
                Pagas e pendentes. Atualiza depois do fechamento da semana.
              </p>
            </CardLink>
          </div>
        </Container>
      </GrainSection>
    );
  }

  if (role === "training") {
    return (
      <GrainSection className="bg-paper-soft min-h-[60dvh]">
        <Container>
          <PageHeader
            title={`Olá, ${session.name ?? "trainee"}`}
            subtitle="Bora terminar o treinamento?"
          />
          <Button href="/treinamento" size="xl">
            Ver matérias
          </Button>
        </Container>
      </GrainSection>
    );
  }

  return (
    <GrainSection className="bg-paper-soft min-h-[60dvh]">
      <Container>
        <PageHeader
          title={`Olá, ${session.name ?? "promotor"}`}
          subtitle={role ? (ROLE_LABEL[role] ?? `Role: ${role}`) : "Bem-vindo."}
        />
        <p className="text-sm text-muted-on-light max-w-prose">
          Sua conta está ativa. Ainda não há um painel para este perfil por aqui —
          se você deveria ver leads ou treinamento, fale com seu coordenador.
        </p>
      </Container>
    </GrainSection>
  );
}

function StageCard({
  title,
  href,
  state,
}: {
  title: string;
  href: string;
  state: "done" | "current" | "todo";
}) {
  return (
    <CardLink href={href}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg">{title}</h2>
        {state === "done" ? (
          <Badge tone="ok">Concluído</Badge>
        ) : state === "current" ? (
          <Badge tone="warn">Agora</Badge>
        ) : (
          <Badge tone="muted">Pendente</Badge>
        )}
      </div>
    </CardLink>
  );
}
