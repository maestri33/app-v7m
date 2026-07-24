import { redirect } from "next/navigation";
import { CircleDollarSign, WalletCards } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { CompactHeader, PageShell } from "@/components/layout/page-shell";
import { djangoFetch } from "@/lib/api/client";
import type { Commission } from "@/lib/api/types";
import { formatBRL } from "@/lib/format";
import { readUnlockedSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export const metadata = { title: "Comissões" };

// Origem da comissão em pt-BR (enum cru do backend nunca chega ao usuário).
const SOURCE_LABEL: Record<string, string> = {
  lead: "Matrícula paga",
  enrollment: "Matrícula paga",
  bonus: "Bônus da meta",
  goal_bonus: "Bônus da meta",
};

function sourceLabel(sourceType: string): string {
  return SOURCE_LABEL[sourceType] ?? "Comissão";
}

export default async function ComissoesPage() {
  const session = await readUnlockedSession();
  if (!session) redirect("/");
  if (!session.roles.includes("promoter")) redirect("/painel");

  const commissions = await djangoFetch<Commission[]>(
    "/api/v1/collaborators/promoter/me/commissions",
  );

  // `amount` é STRING decimal — somar como número só pra exibir.
  const totalPending = commissions
    .filter((c) => c.status === "pending")
    .reduce((s, c) => s + Number(c.amount), 0);
  const totalPaid = commissions
    .filter((c) => c.status === "paid")
    .reduce((s, c) => s + Number(c.amount), 0);

  return (
    <PageShell>
      <CompactHeader
        kicker="Ganhos"
        title="Comissões"
        subtitle="R$ 100 por matrícula paga. Com 5 na semana, você ganha mais R$ 500. Fechamento na sexta-feira, às 18h, via Pix."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="metric-card border-l-4 border-l-[var(--brand-yellow)]">
          <CircleDollarSign aria-hidden className="mb-3 size-5 text-[var(--brand-blue)]" />
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--surface-text-muted)]">A receber</p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums">{formatBRL(totalPending)}</p>
        </div>
        <div className="metric-card">
          <WalletCards aria-hidden className="mb-3 size-5 text-[var(--brand-green)]" />
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--surface-text-muted)]">Recebido</p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums">{formatBRL(totalPaid)}</p>
        </div>
      </div>

      {commissions.length === 0 ? (
        <div className="empty-state text-[var(--surface-text-muted)]">
          Ainda não há comissões. Compartilhe seu link ou use Matricular para
          fazer a primeira indicação.
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {commissions.map((c) => (
            <li key={c.external_id}>
              <div className="surface-card h-full">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-lg">{formatBRL(c.amount)}</p>
                    <p className="text-xs text-[var(--surface-text-muted)]">
                      {sourceLabel(c.source)} ·{" "}
                      {new Date(c.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <Badge
                    tone={
                      c.status === "paid"
                        ? "ok"
                        : c.status === "failed"
                          ? "danger"
                          : "muted"
                    }
                  >
                    {c.status === "paid"
                      ? "Recebida"
                      : c.status === "failed"
                        ? "Falha no pagamento"
                        : "A receber"}
                  </Badge>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
