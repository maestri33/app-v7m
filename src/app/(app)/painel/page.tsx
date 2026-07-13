import { redirect } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Countdown } from "@/components/ui/countdown";
import { PageHeader } from "@/components/ui/page-header";
import { readUnlockedSession } from "@/lib/auth/server";
import { isOnboarding, isPromoter, OUTSIDE_APP_URL } from "@/lib/auth/roles";
import { stageHref } from "@/lib/candidate/funnel";
import { djangoFetch } from "@/lib/api/client";
import { formatBRL } from "@/lib/format";
import type {
  CandidateMe,
  Lead,
  PromoterMe,
  PromoterSummary,
  StudyPricing,
} from "@/lib/api/types";

import { StudyCta } from "./StudyCta";

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
        <GrainSection className="bg-[var(--bg)] min-h-[60dvh]">
          <Container>
            <PageHeader
              title="Cadastro completo!"
              subtitle="Agora é com o seu polo."
            />
            <Card className="max-w-2xl">
              <h2 className="font-display text-lg">Aguardando aprovação do polo</h2>
              <p className="text-sm text-[var(--surface-text-muted)] mt-1">
                Recebemos seu perfil, documento, Pix e selfie. O coordenador do
                seu polo confere e libera — quando aprovar, o treinamento aparece
                aqui sozinho. Por ora, não precisa fazer mais nada.
              </p>
            </Card>
          </Container>
        </GrainSection>
      );
    }

    // rejected = decisão do coordenador (soft): a pessoa continua candidata,
    // sem role de promotor. Sem este card o redirect caía num status sem
    // página e explodia o painel.
    if (me.status === "rejected") {
      return (
        <GrainSection className="bg-brand-bg min-h-[60dvh]">
          <Container>
            <PageHeader
              title="Cadastro não aprovado"
              subtitle="Desta vez não deu — mas dá pra entender o motivo."
            />
            <Card className="max-w-2xl">
              <h2 className="font-display text-lg">Fale com o seu polo</h2>
              <p className="text-sm text-brand-muted mt-1">
                O coordenador do polo revisou seu cadastro e não aprovou por
                enquanto. Entre em contato com o polo pra entender o motivo — em
                muitos casos dá pra resolver e tentar de novo.
              </p>
            </Card>
          </Container>
        </GrainSection>
      );
    }

    // approved = já é promotor no backend, mas a sessão (roles do cookie) ainda
    // não refletiu. Um novo login resolve; enquanto isso, celebra em vez de 500.
    if (me.status === "approved") {
      return (
        <GrainSection className="bg-brand-bg min-h-[60dvh]">
          <Container>
            <PageHeader
              title="Cadastro aprovado! 🎉"
              subtitle="Bem-vindo(a) ao time."
            />
            <Card className="max-w-2xl">
              <h2 className="font-display text-lg">Só falta entrar de novo</h2>
              <p className="text-sm text-brand-muted mt-1">
                Seu acesso de promotor já está liberado. Saia e entre de novo no
                app pra carregar o seu novo painel — treinamento e link de
                indicação estarão te esperando.
              </p>
            </Card>
          </Container>
        </GrainSection>
      );
    }

    // O candidato nunca "escolhe" etapa: cai direto no passo atual do funil.
    // O FunnelStepper de cada página é o indicador de progresso (não clicável).
    // `stageHref` (com fallback) — um status novo no back não pode virar
    // redirect(undefined) → 500.
    redirect(stageHref(me.status));
  }

  if (isPromoter(session.roles)) {
    // Números direto do backend (summary) — o front não calcula comissão.
    // Pricing do "estude você também" é opcional: sem preço, o card não aparece.
    const [me, summary, leads, studyPricing] = await Promise.all([
      djangoFetch<PromoterMe>("/api/v1/collaborators/promoter/me"),
      djangoFetch<PromoterSummary>("/api/v1/collaborators/promoter/me/summary"),
      djangoFetch<Lead[]>("/api/v1/collaborators/promoter/me/leads"),
      djangoFetch<StudyPricing>("/api/v1/collaborators/promoter/study/pricing").catch(
        () => null,
      ),
    ]);

    const goal = summary.week_goal;
    const paid = summary.week_paid_leads;
    const remaining = Math.max(0, goal - paid);
    // Previsto pra sexta = acumulado + bônus (se a meta fechar assim). Strings
    // decimais somadas só pra exibição.
    const projected =
      Number(summary.week_commission_total) +
      (summary.goal_reached ? Number(summary.bonus_amount) : 0);

    const weekStart = summary.week_start ? new Date(summary.week_start) : null;
    const weekLeads = weekStart
      ? leads.filter((l) => new Date(l.created_at) >= weekStart)
      : leads;

    // Clima da semana (do protótipo): plantando → esquentando → quase lá → troféu.
    const heroEmoji =
      paid >= goal ? "🏆" : paid >= Math.ceil(goal * 0.6) ? "⚡" : paid >= 1 ? "🔥" : "🌱";

    return (
      <GrainSection className="bg-[var(--bg)] min-h-[60dvh]">
        <Container>
          <PageHeader
            title={`Olá, ${session.name ?? "promotor"}`}
            subtitle={
              <span className="inline-flex items-center gap-2">
                <Badge tone={me.status === "active" ? "ok" : "danger"}>
                  {me.status === "active" ? "Ativo" : "Suspenso"}
                </Badge>
              </span>
            }
          />

          <div className="max-w-2xl space-y-4">
            {/* Recebido × previsto */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <p className="text-xs uppercase tracking-wider text-[var(--surface-text-muted)]">
                  Já recebido
                </p>
                <p className="font-display mt-1 text-2xl">
                  {formatBRL(summary.lifetime.total_received)}
                </p>
                <p className="text-xs text-[var(--surface-text-muted)] mt-0.5">fechamentos passados</p>
              </Card>
              <Card className="border-brand-gold/50">
                <p className="text-xs uppercase tracking-wider text-brand-gold-ink">
                  Previsto pra sexta
                </p>
                <p className="font-display mt-1 text-2xl">{formatBRL(projected)}</p>
                <p className="text-xs text-[var(--surface-text-muted)] mt-0.5">se fechar assim</p>
              </Card>
            </div>

            {/* HERO: meta da semana */}
            <div className="rounded-[var(--radius)] border border-brand-gold/40 bg-brand-char p-5 text-[var(--surface)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-gold-light">
                  Meta da semana
                </p>
                <p className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                  fecha em{" "}
                  <Countdown
                    target={summary.next_closing_at}
                    urgentBelowHours={summary.goal_reached ? undefined : 24}
                  />
                </p>
              </div>
              <p className="flex items-baseline gap-2 font-display text-3xl">
                <span aria-hidden className="text-[2rem] leading-none">{heroEmoji}</span>
                <span>
                  {paid}
                  <span className="text-lg text-[var(--surface-text-muted)]-on-dark"> / {goal} matrículas</span>
                </span>
              </p>
              <div className="my-3 flex gap-1.5" aria-hidden>
                {Array.from({ length: goal }, (_, i) => (
                  <div
                    key={i}
                    className={`h-2 flex-1 rounded-full ${
                      i < paid ? "bg-brand-gold" : "bg-white/15"
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm font-medium">
                {summary.goal_reached
                  ? `Meta batida! 🏆 Bônus de ${formatBRL(summary.bonus_amount)} garantido nesta semana.`
                  : `Faltam ${remaining} matrícula${remaining === 1 ? "" : "s"} pra bater a meta.`}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-[var(--radius-sm)] bg-white/5 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--surface-text-muted)]-on-dark">
                    Acumulado na semana
                  </p>
                  <p className="font-display text-lg">
                    {formatBRL(summary.week_commission_total)}
                  </p>
                  <p className="text-[10px] text-[var(--surface-text-muted)]-on-dark">
                    R$100 por matrícula paga
                  </p>
                </div>
                <div className="rounded-[var(--radius-sm)] bg-brand-gold/10 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brand-gold-light">
                    Bônus · {goal} alunos
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {summary.goal_reached
                      ? `${formatBRL(summary.bonus_amount)} garantidos ✓`
                      : `${formatBRL(summary.bonus_amount)} fixos se fechar ${goal}`}
                  </p>
                </div>
              </div>

              {/* Leads da semana */}
              {weekLeads.length === 0 && (
                <p className="mt-4 rounded-[var(--radius-sm)] bg-white/5 px-3 py-3 text-sm text-[var(--surface-text-muted)]-on-dark">
                  Sua semana começa agora: compartilhe seu link logo abaixo e a
                  primeira matrícula aparece aqui. 🌱
                </p>
              )}
              {weekLeads.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {weekLeads.slice(0, 4).map((l) => (
                    <li
                      key={l.external_id}
                      className="flex items-center gap-3 rounded-[var(--radius-sm)] bg-white/5 px-3 py-2"
                    >
                      <span
                        aria-hidden
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-gold/20 text-xs font-bold text-brand-gold-light"
                      >
                        {(l.name || "?").trim().charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                        {l.name || "Lead sem nome"}
                      </span>
                      {l.status === "paid" ? (
                        <span className="whitespace-nowrap rounded-full bg-brand-gold/20 px-2.5 py-1 text-[10px] font-bold text-brand-gold-light">
                          Pago · cai sexta
                        </span>
                      ) : l.phone ? (
                        <a
                          href={`https://wa.me/${l.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Chamar ${l.name || "o lead"} no WhatsApp`}
                          className="whitespace-nowrap rounded-full bg-white/10 px-3.5 py-2 text-xs font-bold hover:bg-white/20 transition-colors"
                        >
                          Chamar ↗
                        </a>
                      ) : (
                        <span className="text-[10px] text-[var(--surface-text-muted)]-on-dark">
                          sem contato
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 text-center">
                <Button href="/leads" variant="ghost" className="text-sm py-2">
                  Ver todos os leads →
                </Button>
              </div>
            </div>

            {/* Link de captação */}
            {me.ref_url && (
              <Card>
                <p className="text-xs uppercase tracking-wider text-[var(--surface-text-muted)] mb-2">
                  Seu link de captação
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="rounded bg-[var(--bg)] px-2 py-1 border border-[var(--surface-border)] text-sm break-all">
                    {me.ref_url}
                  </code>
                  <CopyButton value={me.ref_url} label="Copiar link" />
                </div>
              </Card>
            )}

            {/* Estude você também — auto-matrícula (sem comissão) */}
            {studyPricing?.pix && (
              <Card className="space-y-2">
                <p className="text-xs uppercase tracking-wider text-[var(--surface-text-muted)]">
                  Estude você também
                </p>
                <p className="text-sm text-[var(--surface-text-muted)]">
                  Conclua seus estudos na mesma escola que você indica — matrícula
                  por <strong className="text-[var(--surface-text)]">{formatBRL(studyPricing.pix)}</strong> no
                  Pix{studyPricing.card?.installments
                    ? `, ou ${studyPricing.card.installments}× de ${formatBRL(studyPricing.card.installment)} no cartão`
                    : ""}.
                </p>
                <StudyCta />
              </Card>
            )}

            {/* Jornada / lifetime */}
            <Card>
              <p className="text-xs uppercase tracking-wider text-[var(--surface-text-muted)] mb-3">
                Sua jornada
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="font-display text-xl">{summary.lifetime.total_students}</p>
                  <p className="text-xs text-[var(--surface-text-muted)] leading-snug">
                    vidas que você ajudou a mudar
                  </p>
                </div>
                <div>
                  <p className="font-display text-xl">{summary.lifetime.goals_hit}×</p>
                  <p className="text-xs text-[var(--surface-text-muted)] leading-snug">
                    metas semanais batidas
                  </p>
                </div>
                <div>
                  <p className="font-display text-xl">
                    {formatBRL(summary.lifetime.total_received)}
                  </p>
                  <p className="text-xs text-[var(--surface-text-muted)] leading-snug">recebido no total</p>
                </div>
              </div>
            </Card>
          </div>
        </Container>
      </GrainSection>
    );
  }

  // Sem role interna nenhuma (o layout já intercepta com a tela "Fora"; aqui é
  // só o cinto de segurança) → conta do app do cliente.
  redirect(OUTSIDE_APP_URL);
}
