import { redirect } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Stat } from "@/components/ui/Stat";
import { djangoFetch } from "@/lib/api/client";
import type { Commission } from "@/lib/api/types";
import { readSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export const metadata = { title: "Comissões" };

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
    <GrainSection className="bg-paper-soft min-h-[60dvh]">
      <Container>
        <PageHeader title="Suas comissões" />

        <div className="mb-8 grid gap-3 max-w-2xl sm:grid-cols-2">
          <Stat label="Pendente" value={brl(totalPending)} />
          <Stat label="Pago" value={brl(totalPaid)} />
        </div>

        {commissions.length === 0 ? (
          <Card className="max-w-2xl text-muted-on-light">
            Nenhuma comissão ainda. Elas aparecem após o fechamento da semana.
          </Card>
        ) : (
          <ul className="space-y-3 max-w-2xl">
            {commissions.map((c) => (
              <li key={c.external_id}>
                <Card>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-display text-lg">{brl(c.amount)}</p>
                      <p className="text-xs text-muted-on-light">
                        {c.source_type} ·{" "}
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
                        ? "Paga"
                        : c.status === "failed"
                          ? "Falhou"
                          : "Pendente"}
                    </Badge>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </GrainSection>
  );
}
