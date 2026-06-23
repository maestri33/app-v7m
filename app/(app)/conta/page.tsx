import { redirect } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { PageHeader } from "@/components/ui/PageHeader";
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
    <GrainSection className="bg-paper-soft min-h-[60dvh]">
      <Container>
        <PageHeader kicker="V7M · Você" title="Sua conta" />

        <div className="max-w-2xl space-y-6">
          <div>
            <p className="text-sm text-muted-on-light">Nome</p>
            <p className="font-medium">{session.name ?? "—"}</p>
          </div>

          <div>
            <p className="text-sm text-muted-on-light">Acesso atual</p>
            <p className="font-medium">{session.roles.join(", ")}</p>
          </div>

          <LogoutButton className="inline-flex items-center justify-center rounded-full border border-line-light bg-paper px-6 py-3 text-sm font-semibold text-muted-on-light transition-colors hover:border-danger hover:text-danger" />
        </div>
      </Container>
    </GrainSection>
  );
}
