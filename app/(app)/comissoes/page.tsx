import { redirect } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { djangoFetch } from "@/lib/api/client";
import type { Commission } from "@/lib/api/types";
import { readSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function ComissoesPage() {
  const session = await readSession();
  if (!session) redirect("/entrar");
  if (!session.roles.includes("promoter")) redirect("/painel");

  const commissions = await djangoFetch<Commission[]>(
    "/api/v1/collaborators/promoter/me/commissions",
  );

  const totalPending = commissions
    .filter((c) => c.status === "pending")
    .reduce((s, c) => s + c.amount, 0);
  const totalPaid = commissions
    .filter((c) => c.status === "paid")
    .reduce((s, c) => s + c.amount, 0);

  return (
    <GrainSection className="bg-paper-soft min-h-[60vh]">
      <Container>
        <p className="kicker text-gold-ink">V7M · Promotor</p>
        <h1 className="mb-3" style={{ fontSize: "var(--text-h2-sm)" }}>
          Suas comissões
        </h1>

        <div className="mb-8 grid gap-3 max-w-2xl sm:grid-cols-2">
          <Stat label="Pendente" value={brl(totalPending)} />
          <Stat label="Pago" value={brl(totalPaid)} />
        </div>

        {commissions.length === 0 ? (
          <p className="text-muted-on-light">Nenhuma comissão ainda.</p>
        ) : (
          <ul className="space-y-3 max-w-2xl">
            {commissions.map((c) => (
              <li
                key={c.external_id}
                className="rounded-[var(--radius)] border border-line-light/20 bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display text-lg">{brl(c.amount)}</p>
                    <p className="text-xs text-muted-on-light">
                      {c.source_type} · {new Date(c.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <span
                    className={`text-xs uppercase tracking-wider ${
                      c.status === "paid"
                        ? "text-green-700"
                        : c.status === "failed"
                          ? "text-red-700"
                          : "text-muted-on-light"
                    }`}
                  >
                    {c.status === "paid"
                      ? "Paga"
                      : c.status === "failed"
                        ? "Falhou"
                        : "Pendente"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </GrainSection>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-line-light/20 bg-white p-4">
      <p className="text-xs uppercase tracking-wider text-muted-on-light">{label}</p>
      <p className="text-2xl font-display mt-1">{value}</p>
    </div>
  );
}
