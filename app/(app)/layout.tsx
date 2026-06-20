import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { LogoutButton } from "./LogoutButton";
import { readSession } from "@/lib/auth/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await readSession();
  if (!session) {
    redirect("/entrar");
  }

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <header className="sticky top-0 z-40 border-b border-line-light bg-paper-soft/90 backdrop-blur-sm">
        <Container className="py-4 flex items-center justify-between gap-4">
          <Link
            href="/painel"
            className="font-display text-lg hover:text-gold-ink transition-colors"
          >
            V7M<span className="text-gold-ink"> · </span>Promotor
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-on-light hidden sm:inline">
              {session.name ?? "Você"} · {session.roles.join(", ") || "—"}
            </span>
            <LogoutButton />
          </div>
        </Container>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  );
}
