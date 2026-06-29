import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { readUnlockedSession } from "@/lib/auth/server";
import { isCoordinator } from "@/lib/auth/roles";

// Mesma casca do promotor, contexto coordenação. Login único: usa a sessão
// normal (não há mais login/whoami separado de leadership). Gate: precisa de
// `coordinator`; senão é promotor sem polo → painel. /treinamento NÃO vive aqui,
// então readUnlockedSession (trava de training) é seguro, sem loop.
export default async function LeadershipLayout({ children }: { children: ReactNode }) {
  const session = await readUnlockedSession();
  if (!session) redirect("/");
  if (!isCoordinator(session.roles)) redirect("/painel");

  return (
    <AppShell session={session} context="coordination">
      {children}
    </AppShell>
  );
}
