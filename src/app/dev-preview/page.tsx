import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { PageHeader } from "@/components/ui/page-header";
import type { Session } from "@/lib/auth/server";

// Preview dev-only do shell: renderiza o AppShell com sessões FALSAS pra QA
// visual (screenshot 390x844) sem login nem backend. 404 em produção — NÃO é
// rota de produto. Acesse /dev-preview?role=<estado>.
export const dynamic = "force-dynamic";

type Mock = { session: Session; lockedOverlay?: boolean };

const MOCKS: Record<string, Mock> = {
  // candidato em onboarding: casca sem nav (só o wizard depois)
  candidate: {
    session: { external_id: "demo", name: "Ana Candidata", roles: ["candidate"] },
  },
  // promotor puro: aba Início · Leads · Comissões
  promoter: {
    session: { external_id: "demo", name: "Bia Promotora", roles: ["promoter"] },
  },
  // coordinator cai no painel como promotor (área de coordenação mora em hub.v7m.org)
  coordinator: {
    session: {
      external_id: "demo",
      name: "Cau Coordenador",
      roles: ["promoter", "coordinator"],
    },
  },
  // training travado: a casca esconde nav; o overlay do TrainingGate cobre a
  // tela. Aqui mostramos o overlay ESTÁTICO (sem o redirect real, que num
  // preview sem sessão bateria de volta no login).
  training: {
    session: {
      external_id: "demo",
      name: "Dudu Trainee",
      roles: ["promoter", "training"],
    },
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
    <AppShell session={mock.session}>
      <GrainSection className="bg-brand-bg min-h-[60dvh]">
        <Container>
          <PageHeader
            kicker={`preview · ${role}`}
            title="Conteúdo da página"
            subtitle="Placeholder pra ver a casca (header, bottom-nav) no viewport real."
          />
          <p className="text-sm text-brand-muted max-w-prose">
            Esta tela existe só pra QA visual do shell. Troque o estado com{" "}
            <code className="text-brand-ink">?role=</code>: candidate · promoter ·
            coordinator · training.
          </p>
        </Container>
      </GrainSection>

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
