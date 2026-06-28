import { headers } from "next/headers";

import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { PageHeader } from "@/components/ui/page-header";
import { CandidatosList } from "@/components/leadership/CandidatosList";
import type { CandidateAwaiting } from "@/components/leadership/CandidatosList";
import { djangoFetch, DjangoError } from "@/lib/api/client";
import { LEADERSHIP } from "@/lib/api/leadership";
import type { PromoterMe } from "@/lib/api/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Candidatos" };

// L2 (leitura). GET /leadership/candidates → CandidateAwaitingOut[] (contrato
// confirmado no OpenAPI vivo 2026-06-23). As DECISÕES (aprovar/rejeitar/decidir
// selfie+doc) são identidade real → entram num Portão com o Victor, não aqui.
export default async function CandidatosPage() {
  let data: CandidateAwaiting[] | null = null;
  let errorCode: string | null = null;
  try {
    data = await djangoFetch<CandidateAwaiting[]>(`${LEADERSHIP}/candidates`);
  } catch (e) {
    errorCode = e instanceof DjangoError ? e.body.code : "ERROR";
  }

  // Link de recrutamento do polo. O coordenador também é promotor, então
  // promoter/me traz o hub do polo dele. Quem se cadastrar com ?ref=<hub_external_id>
  // cai NESTE polo — sem isso o candidato vai pro polo padrão e some desta fila.
  // (≠ link de captação de LEAD do promotor, que usa ?ref=<promoter_id> no app do aluno.)
  let recruitUrl: string | null = null;
  try {
    const me = await djangoFetch<PromoterMe>("/api/v1/collaborators/promoter/me");
    if (me.hub_external_id) {
      const h = await headers();
      const host = h.get("host") ?? "";
      const proto =
        h.get("x-forwarded-proto") ??
        (host.startsWith("localhost") || host.startsWith("0.") ? "http" : "https");
      recruitUrl = `${proto}://${host}/?ref=${me.hub_external_id}`;
    }
  } catch {
    recruitUrl = null;
  }

  return (
    <Container className="py-10">
      <PageHeader
        kicker="V7M · Coordenador"
        title="Candidatos"
        subtitle="Quem está aguardando a sua aprovação pra virar promotor."
      />

      {recruitUrl && (
        <Card className="mb-6 max-w-2xl">
          <h2 className="font-display text-base">Link de recrutamento do polo</h2>
          <p className="text-sm text-brand-muted mt-1 mb-3">
            Compartilhe com quem você quer trazer. Quem se cadastrar por este link já
            entra como candidato do seu polo.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded bg-brand-surface px-2 py-1 border border-brand-border text-brand-ink text-sm break-all">
              {recruitUrl}
            </code>
            <CopyButton value={recruitUrl} label="Copiar link" />
          </div>
        </Card>
      )}

      {errorCode ? (
        <Card className="text-brand-muted">
          Não deu pra carregar os candidatos agora ({errorCode}). Atualize a página.
        </Card>
      ) : !data || data.length === 0 ? (
        <Card className="text-brand-muted">
          Nenhum candidato aguardando no seu polo. Tudo em dia.
        </Card>
      ) : (
        <CandidatosList items={data} />
      )}
    </Container>
  );
}
