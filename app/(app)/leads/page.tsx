import { redirect } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { djangoFetch } from "@/lib/api/client";
import type { Lead } from "@/lib/api/types";
import { readSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export const metadata = { title: "Leads" };

export default async function LeadsPage() {
  const session = await readSession();
  if (!session) redirect("/entrar");
  if (!session.roles.includes("promoter")) redirect("/painel");

  const leads = await djangoFetch<Lead[]>("/api/v1/collaborators/promoter/me/leads");

  return (
    <GrainSection className="bg-paper-soft min-h-[60dvh]">
      <Container>
        <PageHeader
          title="Seus leads"
          subtitle="Quem clicou no seu link de captação."
        />

        {leads.length === 0 ? (
          <Card className="max-w-2xl text-muted-on-light">
            Nenhum lead ainda. Compartilhe seu link de captação para começar!
          </Card>
        ) : (
          <ul className="space-y-3 max-w-2xl">
            {leads.map((l) => (
              <li key={l.external_id}>
                <Card>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display text-lg">{l.name}</h2>
                      <p className="text-xs text-muted-on-light mt-1">
                        {new Date(l.created_at).toLocaleString("pt-BR")}
                        {l.hub_name ? ` · polo ${l.hub_name}` : ""}
                      </p>
                    </div>
                    <Badge tone="muted">{l.status}</Badge>
                  </div>
                  {(l.payment_link || l.receipt_url) && (
                    <div className="mt-3 flex flex-wrap gap-4 text-sm">
                      {l.payment_link && (
                        <a
                          href={l.payment_link}
                          className="text-gold-ink underline hover:text-gold-deep"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          link de pagamento
                        </a>
                      )}
                      {l.receipt_url && (
                        <a
                          href={l.receipt_url}
                          className="text-gold-ink underline hover:text-gold-deep"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          recibo
                        </a>
                      )}
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </GrainSection>
  );
}
