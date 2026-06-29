import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { djangoFetch, DjangoError } from "@/lib/api/client";
import { LEADERSHIP, type LeadDetail } from "@/lib/api/leadership";

export const dynamic = "force-dynamic";

function renderValue(v: unknown): string {
  if (v == null || v === "") return "—";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
    return String(v);
  }
  return JSON.stringify(v);
}

/** Renderiza um objeto aninhado (customer/promoter/checkout) campo a campo. */
function Section({
  title,
  obj,
}: {
  title: string;
  obj?: Record<string, unknown> | null;
}) {
  if (!obj || Object.keys(obj).length === 0) return null;
  return (
    <Card>
      <h2 className="font-display text-base mb-3">{title}</h2>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {Object.entries(obj).map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs uppercase tracking-wide text-brand-muted">
              {k.replace(/_/g, " ")}
            </dt>
            <dd className="text-brand-ink break-words">{renderValue(v)}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let lead: LeadDetail | null = null;
  let errorCode: string | null = null;
  try {
    lead = await djangoFetch<LeadDetail>(`${LEADERSHIP}/leads/${id}`);
  } catch (e) {
    errorCode = e instanceof DjangoError ? e.body.code : "ERROR";
  }

  const notInHub = errorCode != null && errorCode.endsWith("NOT_FOUND");
  const customerName =
    lead?.customer && typeof lead.customer.name === "string"
      ? (lead.customer.name as string)
      : null;

  return (
    <Container narrow className="py-10">
      <Link
        href="/coordenador/leads"
        className="text-sm text-brand-muted hover:text-brand-ink underline"
      >
        ← Voltar pros leads
      </Link>

      {errorCode ? (
        <Card className="mt-6 text-brand-muted">
          {notInHub
            ? "Esse lead não é do seu polo (ou não existe)."
            : `Não deu pra carregar o lead (${errorCode}).`}
        </Card>
      ) : lead ? (
        <div className="mt-6 space-y-4">
          <PageHeader
            kicker="V7M · Coordenador"
            title={customerName ?? "Lead"}
            subtitle={lead.status ?? undefined}
          />
          {lead.failed_reason && (
            <Card className="text-brand-muted">
              Motivo da falha: {lead.failed_reason}
            </Card>
          )}
          <Section title="Cliente" obj={lead.customer} />
          <Section title="Promotor" obj={lead.promoter} />
          <Section title="Checkout" obj={lead.checkout} />
        </div>
      ) : null}
    </Container>
  );
}
