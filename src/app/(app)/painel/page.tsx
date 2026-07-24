import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { Countdown } from "@/components/ui/countdown";
import { readUnlockedSession } from "@/lib/auth/server";
import { isOnboarding, isPromoter, OUTSIDE_APP_URL } from "@/lib/auth/roles";
import { candidateStageHref } from "@/lib/candidate/funnel";
import { djangoFetch } from "@/lib/api/client";
import { formatBRL } from "@/lib/format";
import type {
  CandidateMe,
  PromoterMe,
  PromoterSummary,
} from "@/lib/api/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "Painel" };

export default async function PainelPage() {
  const session = await readUnlockedSession();
  if (!session) redirect("/");

  if (isOnboarding(session.roles)) {
    const me = await djangoFetch<CandidateMe>("/api/v1/collaborators/candidate/me");
    if (me.status === "completed") {
      const recoveryRoute = candidateStageHref(me);
      if (recoveryRoute !== "/painel") redirect(recoveryRoute);
      return (
          <PanelCard>
            <PanelTitle>Cadastro completo!</PanelTitle>
            <PanelSub>As conferências continuam em segundo plano.</PanelSub>
            <PanelBody>
              Recebemos documento, comprovante, Pix, escolaridade e selfie. Você não
              precisa ficar esperando numa tela: se alguma foto precisar de ajuste,
              abriremos exatamente aquela etapa; caso contrário, o treinamento aparece aqui.
            </PanelBody>
        </PanelCard>
      );
    }
    if (me.status === "rejected") {
      return (
        <PanelCard>
          <PanelTitle>Cadastro não aprovado</PanelTitle>
          <PanelSub>Fale com o seu polo.</PanelSub>
          <PanelBody>
            O coordenador revisou e não aprovou por enquanto. Em muitos casos dá
            pra resolver e tentar de novo.
          </PanelBody>
        </PanelCard>
      );
    }
    if (me.status === "approved") {
      return (
        <PanelCard>
          <PanelTitle>Cadastro aprovado! 🎉</PanelTitle>
          <PanelSub>Só falta entrar de novo.</PanelSub>
          <PanelBody>
            Seu acesso de promotor já está liberado. Saia e entre de novo no app
            pra carregar o seu novo painel — treinamento e link de indicação
            estarão te esperando.
          </PanelBody>
        </PanelCard>
      );
    }
    redirect(candidateStageHref(me));
  }

  if (isPromoter(session.roles)) {
    // Números direto do backend (summary) — o front não calcula comissão.
    // Pricing do "estude você também" é opcional.
    const [me, summary] = await Promise.all([
      djangoFetch<PromoterMe>("/api/v1/collaborators/promoter/me"),
      djangoFetch<PromoterSummary>("/api/v1/collaborators/promoter/me/summary"),
    ]);

    const goal = summary.week_goal;
    const paid = summary.week_paid_leads;
    const remaining = Math.max(0, goal - paid);
    const scholarshipPaid = summary.lifetime.total_students;
    const scholarshipEnrollRemaining = Math.max(0, 3 - scholarshipPaid);
    const scholarshipExamRemaining = Math.max(0, 10 - scholarshipPaid);
    const heroEmoji =
      paid >= goal ? "🏆" : paid >= Math.ceil(goal * 0.6) ? "⚡" : paid >= 1 ? "🔥" : "🌱";

    return (
      <div className="space-y-4">
        {me.pre_matriculado && (
          <section className="auth-card space-y-3 border-brand-gold-dark/50" aria-label="Sua bolsa de estudos">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-gold-ink">
                Sua bolsa de estudos
              </p>
              <h2 className="font-display text-lg text-[var(--surface-text)]">
                {scholarshipEnrollRemaining > 0
                  ? `Faltam ${scholarshipEnrollRemaining} matrículas pagas para efetivar sua matrícula`
                  : "Sua matrícula como bolsista foi conquistada"}
              </h2>
            </div>
            <p className="text-sm text-[var(--surface-text-muted)]">
              Você já tem {scholarshipPaid} de 3 indicações pagas para entrar como aluno.
              A prova final é liberada ao chegar a 10, junto com os documentos do curso.
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-brand-border" aria-hidden>
              <div
                className="h-full rounded-full bg-brand-gold"
                style={{ width: `${Math.min(100, (scholarshipPaid / 10) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-brand-muted">
              {scholarshipExamRemaining > 0
                ? `Faltam ${scholarshipExamRemaining} indicações pagas para o requisito da prova final.`
                : "Requisito de 10 indicações pagas atingido."}
            </p>
          </section>
        )}
        {/* Greeting */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-xl text-[var(--surface-text)] truncate">
            Olá, {session.name ?? "promotor"}
          </h1>
          <Badge tone={me.status === "active" ? "ok" : "danger"}>
            {me.status === "active" ? "Ativo" : "Suspenso"}
          </Badge>
        </div>

        {/* HERO: meta da semana (a alma do home) */}
        <div className="rounded-[var(--radius)] border border-brand-gold/40 bg-brand-char p-4 text-[var(--surface)]">
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-gold-light">
              Meta da semana
            </p>
            <p className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap">
              fecha em{" "}
              <Countdown
                target={summary.next_closing_at}
                urgentBelowHours={summary.goal_reached ? undefined : 24}
              />
            </p>
          </div>
          <p className="flex items-baseline gap-2 font-display">
            <span aria-hidden className="text-[1.5rem] leading-none">{heroEmoji}</span>
            <span className="text-2xl">
              {paid}
              <span className="text-sm text-brand-muted-on-dark"> / {goal}</span>
            </span>
          </p>
          <div className="mt-2 flex gap-1.5" aria-hidden>
            {Array.from({ length: goal }, (_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full ${
                  i < paid ? "bg-brand-gold" : "bg-white/15"
                }`}
              />
            ))}
          </div>
          <p className="mt-2 text-xs">
            {summary.goal_reached
              ? `🏆 Bônus de ${formatBRL(summary.bonus_amount)} garantido.`
              : `Faltam ${remaining} matrícula${remaining === 1 ? "" : "s"} pra meta.`}
          </p>
        </div>

        {/* Recebido × previsto — linha compacta */}
        <div className="grid grid-cols-2 gap-2 text-[var(--surface-text)]">
          <div className="rounded-[var(--radius-sm)] bg-[var(--surface)] border border-[var(--surface-border)] px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-[var(--surface-text-muted)]">
              Recebido
            </p>
            <p className="font-display text-sm tabular-nums">
              {formatBRL(summary.lifetime.total_received)}
            </p>
          </div>
          <div className="rounded-[var(--radius-sm)] bg-[var(--surface)] border border-brand-gold/30 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-brand-gold-ink">
              Previsto
            </p>
            <p className="font-display text-sm tabular-nums">
              {formatBRL(
                Number(summary.week_commission_total) +
                  (summary.goal_reached ? Number(summary.bonus_amount) : 0),
              )}
            </p>
          </div>
        </div>

        {/* Link de captação — uma linha + cópia */}
        {me.ref_url && (
          <div className="rounded-[var(--radius-sm)] bg-[var(--surface)] border border-[var(--surface-border)] px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-[var(--surface-text-muted)] mb-1">
              Seu link
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 min-w-0 truncate text-xs text-[var(--surface-text)]">
                {me.ref_url}
              </code>
              <CopyButton value={me.ref_url} label="Copiar" />
            </div>
          </div>
        )}
        {/* Leads/comissões via bottom-nav. Jornada/estude você também ficam na aba Conta. */}
      </div>
    );
  }

  redirect(OUTSIDE_APP_URL);
}

/* Subcomponentes compactos do home (não viram primitives — só UI local). */
function PanelCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-card max-w-md mx-auto">
      <div className="space-y-3">{children}</div>
    </div>
  );
}
function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="font-display text-xl text-[var(--surface-text)]">
      {children}
    </h1>
  );
}
function PanelSub({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-[var(--surface-text-muted)]">{children}</p>
  );
}
function PanelBody({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[var(--surface-text)]">{children}</p>;
}
