import { redirect } from "next/navigation";
import { MessageCircle, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CompactHeader, PageShell } from "@/components/layout/page-shell";
import { djangoFetch } from "@/lib/api/client";
import type { Lead, PromoterSummary } from "@/lib/api/types";
import { readUnlockedSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export const metadata = { title: "Indicações" };

/**
 * 3 estados por lead: aguardando pagamento; pago nesta semana (comissão cai no
 * fechamento de sexta); pago em semana passada (comissão já repassada).
 * Distinção pago×recebido pelo `week_start` do summary — criado antes da semana
 * corrente = fechamento anterior, já pago.
 */
type LeadState = "waiting" | "paid_pending" | "paid_settled";

function leadState(lead: Lead, weekStart: Date | null): LeadState {
  if (lead.status !== "paid") return "waiting";
  if (weekStart && new Date(lead.created_at) < weekStart) return "paid_settled";
  return "paid_pending";
}

export default async function LeadsPage() {
  const session = await readUnlockedSession();
  if (!session) redirect("/");
  if (!session.roles.includes("promoter")) redirect("/painel");

  const [leads, summary] = await Promise.all([
    djangoFetch<Lead[]>("/api/v1/collaborators/promoter/me/leads"),
    djangoFetch<PromoterSummary>("/api/v1/collaborators/promoter/me/summary"),
  ]);
  const weekStart = summary.week_start ? new Date(summary.week_start) : null;

  return (
    <PageShell width="default">
      <CompactHeader
        kicker="Indicações"
        title="Suas indicações"
        subtitle="Acompanhe as pessoas indicadas e o status de cada matrícula."
      />

      {leads.length === 0 ? (
        <div className="empty-state">
          <span className="grid size-12 place-items-center rounded-2xl bg-[var(--brand-green-soft)] text-[var(--brand-green-strong)]">
            <UsersRound aria-hidden className="size-6" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold">Comece pela primeira indicação</h2>
            <p className="mt-1 text-sm text-[var(--surface-text-muted)]">
            Você ainda não fez indicações. Compartilhe seu link ou use
            Matricular para enviar um convite.
            </p>
          </div>
          <Button href="/painel">Ver meu link</Button>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {leads.map((l) => {
            const state = leadState(l, weekStart);
            return (
              <li key={l.external_id}>
                <div className="surface-card h-full">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        aria-hidden
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--brand-blue-soft)] font-extrabold text-[var(--brand-blue)]"
                      >
                        {(l.name || "?").trim().charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-base font-extrabold leading-snug">
                          {l.name || "Indicação sem nome"}
                        </h2>
                        <p className="text-xs text-[var(--surface-text-muted)] mt-0.5">
                          {new Date(l.created_at).toLocaleString("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                    </div>
                    {state === "paid_settled" ? (
                      <Badge tone="ok">Comissão recebida</Badge>
                    ) : state === "paid_pending" ? (
                      <Badge tone="gold">Matrícula paga</Badge>
                    ) : (
                      <Badge tone="warn">Aguardando pagamento</Badge>
                    )}
                  </div>
                  {state === "waiting" && l.phone && (
                    <a
                      href={`https://wa.me/${l.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Chamar ${l.name || "a pessoa"} no WhatsApp`}
                      className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-alt)] px-4 py-2 text-sm font-bold text-[var(--brand-green-strong)] transition-colors hover:border-[var(--brand-green)]"
                    >
                      <MessageCircle aria-hidden className="size-4" />
                      Chamar no WhatsApp
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
