import { redirect } from "next/navigation";
import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { djangoFetch } from "@/lib/api/client";
import type { Lead } from "@/lib/api/types";
import { readSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const session = await readSession();
  if (!session) redirect("/entrar");
  if (!session.roles.includes("promoter")) redirect("/painel");

  const leads = await djangoFetch<Lead[]>("/api/v1/collaborators/promoter/me/leads");

  return (
    <GrainSection className="bg-paper-soft min-h-[60vh]">
      <Container>
        <p className="kicker text-gold-ink">V7M · Promotor</p>
        <h1 className="mb-3" style={{ fontSize: "var(--text-h2-sm)" }}>
          Seus leads
        </h1>
        <p className="text-muted-on-light mb-8">
          Quem clicou no seu link de captação.
        </p>

        {leads.length === 0 ? (
          <p className="text-muted-on-light">Nenhum lead ainda. Compartilhe seu link!</p>
        ) : (
          <ul className="space-y-3 max-w-2xl">
            {leads.map((l) => (
              <li
                key={l.external_id}
                className="rounded-[var(--radius)] border border-line-light/20 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg">{l.name}</h2>
                    <p className="text-xs text-muted-on-light mt-1">
                      {new Date(l.created_at).toLocaleString("pt-BR")}
                      {l.hub_name ? ` · polo ${l.hub_name}` : ""}
                    </p>
                  </div>
                  <span className="text-xs uppercase tracking-wider text-muted-on-light">
                    {l.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  {l.payment_link && (
                    <Link
                      href={l.payment_link}
                      className="text-gold-ink underline"
                      target="_blank"
                    >
                      link de pagamento
                    </Link>
                  )}
                  {l.receipt_url && (
                    <Link
                      href={l.receipt_url}
                      className="text-gold-ink underline"
                      target="_blank"
                    >
                      recibo
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </GrainSection>
  );
}
