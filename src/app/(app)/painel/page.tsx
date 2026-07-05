import { redirect } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { Badge } from "@/components/ui/badge";
import { Card, CardLink } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { PageHeader } from "@/components/ui/page-header";
import { readUnlockedSession } from "@/lib/auth/server";
import { isOnboarding, isPromoter, OUTSIDE_APP_URL } from "@/lib/auth/roles";
import { STAGE_HREF } from "@/lib/candidate/funnel";
import { djangoFetch } from "@/lib/api/client";
import type { CandidateMe, PromoterMe } from "@/lib/api/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "Painel" };

export default async function PainelPage() {
  const session = await readUnlockedSession();
  if (!session) redirect("/");

  if (isOnboarding(session.roles)) {
    const me = await djangoFetch<CandidateMe>("/api/v1/collaborators/candidate/me");

    // completed = funil terminado, AGUARDANDO aprovação do polo (≠ approved). A
    // pessoa só vira promoter no POST /approve do coordenador; o treinamento (e a
    // trava) aparecem depois disso, lidos do /me. Aqui não há mais o que preencher.
    if (me.status === "completed") {
      return (
        <GrainSection className="bg-brand-bg min-h-[60dvh]">
          <Container>
            <PageHeader
              title="Cadastro completo!"
              subtitle="Agora é com o seu polo."
            />
            <Card className="max-w-2xl">
              <h2 className="font-display text-lg">Aguardando aprovação do polo</h2>
              <p className="text-sm text-brand-muted mt-1">
                Recebemos seu perfil, documento, Pix e selfie. O coordenador do
                seu polo confere e libera — quando aprovar, o treinamento aparece
                aqui sozinho. Por ora, não precisa fazer mais nada.
              </p>
            </Card>
          </Container>
        </GrainSection>
      );
    }

    // O candidato nunca "escolhe" etapa: cai direto no passo atual do funil.
    // O FunnelStepper de cada página é o indicador de progresso (não clicável).
    redirect(STAGE_HREF[me.status]);
  }

  if (isPromoter(session.roles)) {
    const data = await djangoFetch<PromoterMe>("/api/v1/collaborators/promoter/me");
    return (
      <GrainSection className="bg-brand-bg min-h-[60dvh]">
        <Container>
          <PageHeader
            title={`Olá, ${session.name ?? "promotor"}`}
            subtitle={
              <span className="inline-flex items-center gap-2">
                <Badge tone={data.status === "active" ? "ok" : "danger"}>
                  {data.status === "active" ? "Ativo" : "Suspenso"}
                </Badge>
                {data.hub_external_id
                  ? `polo ${data.hub_external_id.slice(0, 8)}`
                  : ""}
              </span>
            }
          />
          {data.ref_url && (
            <div className="-mt-4 mb-8 max-w-2xl">
              <p className="text-sm text-brand-muted mb-1">Seu link de captação</p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="rounded bg-brand-surface px-2 py-1 border border-brand-border text-brand-ink text-sm break-all">
                  {data.ref_url}
                </code>
                <CopyButton value={data.ref_url} label="Copiar link" />
              </div>
            </div>
          )}

          <div className="grid gap-4 max-w-2xl md:grid-cols-2">
            <CardLink href="/leads">
              <h2 className="font-display text-lg">Leads</h2>
              <p className="text-sm text-brand-muted mt-1">
                Quem clicou no seu link e onde está.
              </p>
            </CardLink>
            <CardLink href="/comissoes">
              <h2 className="font-display text-lg">Comissões</h2>
              <p className="text-sm text-brand-muted mt-1">
                Pagas e pendentes. Atualiza depois do fechamento da semana.
              </p>
            </CardLink>
          </div>
        </Container>
      </GrainSection>
    );
  }

  // Sem role interna nenhuma (o layout já intercepta com a tela "Fora"; aqui é
  // só o cinto de segurança) → conta do app do cliente.
  redirect(OUTSIDE_APP_URL);
}
