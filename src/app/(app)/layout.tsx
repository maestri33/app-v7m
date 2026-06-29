import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { readSession } from "@/lib/auth/server";

// Shell ÚNICO, contexto promotor. A trava de training é aplicada DENTRO do
// AppShell (TrainingGate) — aqui NÃO usamos readUnlockedSession porque o próprio
// /treinamento vive sob este layout e entraria em loop de redirect.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await readSession();
  if (!session) redirect("/");

  return (
    <AppShell session={session} context="promoter">
      {children}
    </AppShell>
  );
}
