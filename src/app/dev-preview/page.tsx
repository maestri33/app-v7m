import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { PageHeader } from "@/components/ui/page-header";
import Link from "next/link";
import { CandidatosList } from "@/components/leadership/CandidatosList";
import { CandidatoDetailBody } from "@/components/leadership/CandidatoDetailBody";
import { CandidatoActions } from "@/components/leadership/CandidatoActions";
import type { Session } from "@/lib/auth/server";

// Preview dev-only do shell unificado: renderiza o AppShell com sessões FALSAS
// pra QA visual (screenshot 390x844) sem login nem backend. 404 em produção —
// NÃO é rota de produto. Acesse /dev-preview?role=<estado>.
export const dynamic = "force-dynamic";

type Ctx = "promoter" | "coordination";
type Mock = { session: Session; context: Ctx; lockedOverlay?: boolean };

const MOCKS: Record<string, Mock> = {
  // candidato em onboarding: casca sem nav e sem seletor (só o wizard depois)
  candidate: {
    session: { external_id: "demo", name: "Ana Candidata", roles: ["candidate"] },
    context: "promoter",
  },
  // promotor puro: aba Início · Leads · Comissões
  promoter: {
    session: { external_id: "demo", name: "Bia Promotora", roles: ["promoter"] },
    context: "promoter",
  },
  // coordenador no contexto promotor: seletor Promotor│Coordenação + aba promotor
  coordinator: {
    session: {
      external_id: "demo",
      name: "Cau Coordenador",
      roles: ["promoter", "coordinator"],
    },
    context: "promoter",
  },
  // coordenador no contexto coordenação: seletor + aba de coordenação
  coordination: {
    session: {
      external_id: "demo",
      name: "Cau Coordenador",
      roles: ["promoter", "coordinator"],
    },
    context: "coordination",
  },
  // coordenação · fila de candidatos (L2 read-only) com dados falsos
  candidatos: {
    session: {
      external_id: "demo",
      name: "Cau Coordenador",
      roles: ["promoter", "coordinator"],
    },
    context: "coordination",
  },
  // coordenação · detalhe de candidato (L2 read-only) com objeto livre falso
  candidato: {
    session: {
      external_id: "demo",
      name: "Cau Coordenador",
      roles: ["promoter", "coordinator"],
    },
    context: "coordination",
  },
  // training travado: a casca esconde nav/seletor; o overlay do TrainingGate cobre
  // a tela. Aqui mostramos o overlay ESTÁTICO (sem o redirect real, que num
  // preview sem sessão bateria de volta no login).
  training: {
    session: {
      external_id: "demo",
      name: "Dudu Trainee",
      roles: ["promoter", "training"],
    },
    context: "promoter",
    lockedOverlay: true,
  },
};

export default async function DevPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();

  const { role = "promoter" } = await searchParams;
  const mock = MOCKS[role] ?? MOCKS.promoter;

  return (
    <AppShell session={mock.session} context={mock.context}>
      {role === "candidato" ? (
        <Container className="py-10">
          <Link
            href="/coordenador/candidatos"
            className="inline-flex items-center min-h-11 text-sm text-brand-muted hover:text-brand-ink transition-colors"
          >
            ← Candidatos
          </Link>
          <PageHeader kicker="V7M · Coordenador" title="Marina Alves" />
          <CandidatoDetailBody
            data={{
              external_id: "demo-cand",
              status: "completed",
              user: {
                external_id: "demo-user",
                name: "Marina Alves",
                cpf: "123.456.789-00",
                phone: "(42) 99817-1770",
                email: "marina@example.com",
                birth_date: "1996-04-12",
              },
              doc_type: "CNH",
              mother_name: "Joana Alves",
              father_name: "Carlos Alves",
              marital_status: "Solteira",
              birthplace: "Ponta Grossa - PR",
              nationality: "Brasileira",
              pix_key: "marina@example.com",
              pix_key_type: "email",
              pix_validated: true,
              selfie_status: "approved",
              selfie_description: "Rosto nítido, corresponde ao documento.",
            }}
            errorCode={null}
          />
          <CandidatoActions externalId="demo" detail={null} />
        </Container>
      ) : role === "candidatos" ? (
        <Container className="py-10">
          <PageHeader
            kicker="V7M · Coordenador"
            title="Candidatos"
            subtitle="Quem está aguardando a sua aprovação pra virar promotor."
          />
          <CandidatosList
            items={[
              {
                external_id: "c1",
                name: "Marina Alves",
                since: "2026-06-18T12:00:00Z",
                rejected: false,
              },
              {
                external_id: "c2",
                name: "João Pereira",
                since: "2026-06-20T09:30:00Z",
                rejected: false,
              },
              { external_id: "c3", name: null, since: null, rejected: true },
            ]}
          />
        </Container>
      ) : (
        <GrainSection className="bg-brand-bg min-h-[60dvh]">
          <Container>
            <PageHeader
              kicker={`preview · ${role}`}
              title="Conteúdo da página"
              subtitle="Placeholder pra ver a casca (header, seletor de contexto, abas) no viewport real."
            />
            <p className="text-sm text-brand-muted max-w-prose">
              Esta tela existe só pra QA visual do shell unificado. Troque o estado
              com <code className="text-brand-ink">?role=</code>:
              candidate · promoter · coordinator · coordination · training · candidatos.
            </p>
          </Container>
        </GrainSection>
      )}

      {/* réplica estática do overlay do TrainingGate (sem o router.replace real) */}
      {mock.lockedOverlay && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-50 flex items-center justify-center bg-brand-bg px-6 text-center"
        >
          <p className="text-brand-muted">
            Treinamento obrigatório — levando você para as matérias…
          </p>
        </div>
      )}
    </AppShell>
  );
}
