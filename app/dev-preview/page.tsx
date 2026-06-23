import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { PageHeader } from "@/components/ui/PageHeader";
import { CandidatosList } from "@/components/leadership/CandidatosList";
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
      {role === "candidatos" ? (
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
        <GrainSection className="bg-paper-soft min-h-[60dvh]">
          <Container>
            <PageHeader
              kicker={`preview · ${role}`}
              title="Conteúdo da página"
              subtitle="Placeholder pra ver a casca (header, seletor de contexto, abas) no viewport real."
            />
            <p className="text-sm text-muted-on-light max-w-prose">
              Esta tela existe só pra QA visual do shell unificado. Troque o estado
              com <code className="text-black">?role=</code>:
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-paper-soft px-6 text-center"
        >
          <p className="text-muted-on-light">
            Treinamento obrigatório — levando você para as matérias…
          </p>
        </div>
      )}
    </AppShell>
  );
}
