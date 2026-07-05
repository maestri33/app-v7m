import { redirect } from "next/navigation";
import { AlignLeft, FileText, Image as ImageIcon, Play } from "lucide-react";

import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { Button } from "@/components/ui/button";
import { Card, CardLink } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { djangoFetch } from "@/lib/api/client";
import type { TrainingMaterial } from "@/lib/api/types";
import { readSession } from "@/lib/auth/server";

import { TrainingRefresh } from "./TrainingRefresh";

export const dynamic = "force-dynamic";

export const metadata = { title: "Treinamento" };

/** Resposta aprovada = matéria concluída (shape novo `TrainingMaterialOut`). */
function isApproved(m: TrainingMaterial): boolean {
  return m.submission_status === "approved";
}

function isGrading(m: TrainingMaterial): boolean {
  return m.submission_status === "pending";
}

function KindIcon({ kind }: { kind?: string | null }) {
  const cls = "inline shrink-0";
  if (kind === "video") return <Play size={15} className={cls} aria-hidden />;
  if (kind === "image") return <ImageIcon size={15} className={cls} aria-hidden />;
  if (kind === "pdf") return <FileText size={15} className={cls} aria-hidden />;
  return <AlignLeft size={15} className={cls} aria-hidden />;
}

export default async function TreinamentoPage() {
  const session = await readSession();
  if (!session) redirect("/");
  if (!session.roles.includes("training")) redirect("/painel");

  const materials = await djangoFetch<TrainingMaterial[]>(
    "/api/v1/collaborators/training/materials",
  );

  const blocking = materials.filter((m) => m.blocking);
  const blockingDone = blocking.filter(isApproved);
  const pendingBlocking = blocking.filter((m) => !isApproved(m));
  const focus = pendingBlocking[0] ?? null;
  const extras = materials.filter((m) => !m.blocking && !isApproved(m));
  const done = materials.filter(isApproved);
  const allBlockingDone = blocking.length > 0 && pendingBlocking.length === 0;
  const pct =
    blocking.length > 0
      ? Math.round((blockingDone.length / blocking.length) * 100)
      : 0;
  // Corrigindo uma resposta ou liberando o painel → re-render até resolver.
  const watching = allBlockingDone || materials.some(isGrading);

  return (
    <GrainSection className="bg-brand-bg min-h-[60dvh]">
      <Container>
        {watching && <TrainingRefresh />}
        <PageHeader
          kicker="V7M · Treinamento obrigatório"
          title="Enquanto isso está aqui, o resto fica trancado"
          subtitle="Você só acessa o painel depois de concluir as matérias obrigatórias. A IA corrige na hora."
        />

        <div className="max-w-2xl mb-8">
          <div
            className="h-2 overflow-hidden rounded-full bg-brand-border"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={blocking.length}
            aria-valuenow={blockingDone.length}
            aria-label="Matérias obrigatórias concluídas"
          >
            <div
              className="h-full rounded-full bg-brand-gold transition-[width]"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-brand-muted">
            {blockingDone.length} de {blocking.length} matérias obrigatórias
            concluídas
          </p>
        </div>

        <div className="max-w-2xl space-y-6">
          {allBlockingDone ? (
            <div className="banner banner-ok" role="status">
              <p className="font-display">✓ Treinamento concluído</p>
              <p className="text-sm mt-1 opacity-90">Liberando seu painel…</p>
            </div>
          ) : focus ? (
            <Card className="border-brand-gold/50 space-y-4">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-gold-ink">
                <KindIcon kind={focus.kind} /> Próxima matéria obrigatória
              </p>
              <h2 className="font-display text-lg">{focus.title}</h2>
              {isGrading(focus) ? (
                <p
                  className="flex items-center gap-2 text-sm font-medium text-brand-gold-ink"
                  role="status"
                >
                  <span className="spinner" aria-hidden /> Resposta recebida ✓ —
                  nossa IA está avaliando…
                </p>
              ) : (
                <Button
                  href={`/treinamento/${focus.external_id}`}
                  size="xl"
                  className="w-full"
                >
                  Abrir e responder
                </Button>
              )}
            </Card>
          ) : (
            <Card className="text-brand-muted">
              Suas matérias estão sendo preparadas — assim que chegarem,
              aparecem aqui sozinhas. Você não precisa fazer nada por enquanto.
            </Card>
          )}

          {extras.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-muted">
                Extra · opcional
              </p>
              <ul className="space-y-2">
                {extras.map((m) => (
                  <li key={m.external_id}>
                    <CardLink
                      href={`/treinamento/${m.external_id}`}
                      className="flex items-center gap-3 py-3"
                    >
                      <span aria-hidden className="text-brand-gold-ink">
                        <KindIcon kind={m.kind} />
                      </span>
                      <span className="flex-1 text-sm font-semibold">{m.title}</span>
                      <span className="text-xs font-bold text-brand-gold-ink">
                        Abrir
                      </span>
                    </CardLink>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {done.length > 0 && (
            <details className="group">
              <summary className="card card-interactive flex cursor-pointer list-none items-center justify-between gap-3 py-3 text-sm font-semibold text-brand-ok">
                <span>
                  ✓ {done.length} matéria{done.length === 1 ? "" : "s"} concluída
                  {done.length === 1 ? "" : "s"}
                </span>
                <span className="text-xs font-normal text-brand-muted">
                  <span className="group-open:hidden">ver</span>
                  <span className="hidden group-open:inline">ocultar</span>
                </span>
              </summary>
              <ul className="mt-2 space-y-1.5">
                {done.map((m) => (
                  <li
                    key={m.external_id}
                    className="flex items-center gap-2.5 rounded-[var(--radius-sm)] bg-brand-ok/8 px-3 py-2 text-sm"
                  >
                    <span aria-hidden className="text-brand-ok">✓</span>
                    {m.title}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </Container>
    </GrainSection>
  );
}
