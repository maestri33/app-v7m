import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { djangoFetch, DjangoError } from "@/lib/api/client";
import { LEADERSHIP, type HubLeadRow } from "@/lib/api/leadership";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leads" };

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";

  let leads: HubLeadRow[] = [];
  let errorCode: string | null = null;
  try {
    const data = await djangoFetch<unknown>(`${LEADERSHIP}/leads${qs}`);
    leads = Array.isArray(data) ? (data as HubLeadRow[]) : [];
  } catch (e) {
    errorCode = e instanceof DjangoError ? e.body.code : "ERROR";
  }

  return (
    <Container className="py-10">
      <PageHeader
        kicker="V7M · Coordenador"
        title="Leads"
        subtitle="Quem chegou pelo seu polo."
      />

      {errorCode ? (
        <Card className="text-muted-on-light">
          Não deu pra carregar os leads ({errorCode}). Atualize a página.
        </Card>
      ) : leads.length === 0 ? (
        <Card className="text-muted-on-light">
          Nenhum lead {status ? "com esse status" : "por aqui"} ainda.
        </Card>
      ) : (
        <div className="overflow-x-auto rounded border border-line-light">
          <table className="w-full text-sm">
            <thead className="bg-paper-soft text-left text-muted-on-light">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Telefone</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr
                  key={l.external_id}
                  className="border-t border-line-light hover:bg-paper-soft/60"
                >
                  <td className="px-4 py-3 text-black">{l.name ?? "—"}</td>
                  <td className="px-4 py-3">{l.status ?? "—"}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">{l.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/coordenador/leads/${l.external_id}`}
                      className="text-gold-ink underline"
                    >
                      abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Container>
  );
}
