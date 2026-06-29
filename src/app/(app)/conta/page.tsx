import { redirect } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { PageHeader } from "@/components/ui/page-header";
import { LogoutButton } from "@/app/(app)/LogoutButton";
import { readUnlockedSession } from "@/lib/auth/server";

export const metadata = { title: "Conta" };

/**
 * Tela de conta do promotor (e coordenador, no contexto promoter). Reúne:
 * nome, roles ativas e saída do app. Não é back-office — só o básico de perfil.
 */
export default async function ContaPage() {
  const session = await readUnlockedSession();
  if (!session) redirect("/");

  return (
    <GrainSection className="bg-brand-bg min-h-[60dvh]">
      <Container>
        <PageHeader kicker="V7M · Você" title="Sua conta" />

        <div className="max-w-2xl space-y-6">
          <div>
            <p className="text-sm text-brand-muted">Nome</p>
            <p className="font-medium">{session.name ?? "—"}</p>
          </div>

          <div>
            <p className="text-sm text-brand-muted">Acesso atual</p>
            <p className="font-medium">{session.roles.join(", ")}</p>
          </div>

          <LogoutButton className="inline-flex items-center justify-center rounded-full border border-brand-border bg-brand-surface px-6 py-3 text-sm font-semibold text-brand-muted transition-colors hover:border-danger hover:text-danger" />
        </div>
      </Container>
    </GrainSection>
  );
}
