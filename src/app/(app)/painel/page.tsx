import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CircleDollarSign,
  Link2,
  Target,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";

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
  Commission,
  Lead,
  PromoterMe,
  PromoterSummary,
} from "@/lib/api/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "Painel" };

type LeadState = "waiting" | "paid_pending" | "paid_settled";

function leadState(lead: Lead, weekStart: Date | null): LeadState {
  if (lead.status !== "paid") return "waiting";
  if (weekStart && new Date(lead.created_at) < weekStart) return "paid_settled";
  return "paid_pending";
}

function commissionLabel(source: string) {
  return source === "bonus" || source === "goal_bonus" ? "Bônus da meta" : "Matrícula paga";
}

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
            <PanelTitle>Cadastro recebido</PanelTitle>
            <PanelSub>Estamos conferindo os dados.</PanelSub>
            <PanelBody>
              Você pode sair desta tela. Se algo precisar de correção, o app abrirá
              a etapa certa. Quando tudo for aprovado, seu painel será liberado.
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
            Entre em contato com o polo para entender o motivo e saber se é
            possível corrigir o cadastro.
          </PanelBody>
        </PanelCard>
      );
    }
    if (me.status === "approved") {
      return (
        <PanelCard>
          <PanelTitle>Cadastro aprovado! 🎉</PanelTitle>
          <PanelSub>Atualize seu acesso.</PanelSub>
          <PanelBody>
            Saia e entre novamente para abrir o painel de promotor.
          </PanelBody>
        </PanelCard>
      );
    }
    redirect(candidateStageHref(me));
  }

  if (isPromoter(session.roles)) {
    // Números direto do backend (summary) — o front não calcula comissão.
    // Pricing do "estude você também" é opcional.
    const [me, summary, leads, commissions] = await Promise.all([
      djangoFetch<PromoterMe>("/api/v1/collaborators/promoter/me"),
      djangoFetch<PromoterSummary>("/api/v1/collaborators/promoter/me/summary"),
      djangoFetch<Lead[]>("/api/v1/collaborators/promoter/me/leads").catch(() => []),
      djangoFetch<Commission[]>("/api/v1/collaborators/promoter/me/commissions").catch(() => []),
    ]);

    const goal = summary.week_goal;
    const paid = summary.week_paid_leads;
    const remaining = Math.max(0, goal - paid);
    const scholarshipPaid = summary.lifetime.total_students;
    const scholarshipEnrollRemaining = Math.max(0, 3 - scholarshipPaid);
    const scholarshipExamRemaining = Math.max(0, 10 - scholarshipPaid);
    const weekStart = summary.week_start ? new Date(summary.week_start) : null;
    const waitingLeads = leads.filter((lead) => leadState(lead, weekStart) === "waiting").length;
    const paidLeads = leads.length - waitingLeads;
    const pendingCommissions = commissions
      .filter((commission) => commission.status === "pending")
      .reduce((total, commission) => total + Number(commission.amount), 0);
    const firstName = session.name?.trim().split(/\s+/)[0] || "promotor";

    return (
      <div className="page-shell">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="section-label">Seu painel</p>
            <h1 className="mt-1 text-[clamp(1.8rem,4vw,2.75rem)] font-extrabold tracking-[-0.04em] text-[var(--surface-text)]">
              Olá, {firstName}
            </h1>
            <p className="mt-1 text-sm text-[var(--surface-text-muted)]">
              Acompanhe suas indicações e avance na meta da semana.
            </p>
          </div>
          <Badge tone={me.status === "active" ? "ok" : "danger"}>
            {me.status === "active" ? "Conta ativa" : "Conta suspensa"}
          </Badge>
        </header>

        {me.pre_matriculado && (
          <section className="surface-card grid gap-4 border-l-4 border-l-[var(--brand-yellow)] md:grid-cols-[auto_1fr] md:items-center" aria-label="Progresso da sua matrícula">
            <span className="grid size-12 place-items-center rounded-2xl bg-[var(--brand-blue-soft)] text-[var(--brand-blue)]">
              <BookOpenCheck aria-hidden className="size-6" />
            </span>
            <div className="space-y-3">
              <div>
                <p className="section-label">Sua bolsa de estudos</p>
                <h2 className="mt-1 text-lg font-extrabold text-[var(--surface-text)]">
                {scholarshipEnrollRemaining > 0
                  ? `${scholarshipEnrollRemaining === 1 ? "Falta" : "Faltam"} ${scholarshipEnrollRemaining} matrícula${scholarshipEnrollRemaining === 1 ? "" : "s"} paga${scholarshipEnrollRemaining === 1 ? "" : "s"} para efetivar sua matrícula`
                  : scholarshipExamRemaining > 0
                    ? "Matrícula efetivada"
                    : "Requisito da prova final cumprido"}
                </h2>
              </div>
              <p className="text-sm text-[var(--surface-text-muted)]">
              {scholarshipEnrollRemaining > 0
                ? "Com 3 matrículas pagas, sua matrícula é efetivada. Com 10, você libera a prova final."
                : scholarshipExamRemaining > 0
                  ? "Sua matrícula já está efetivada. Com 10 matrículas pagas, você libera a prova final."
                  : "Você atingiu as 10 matrículas pagas e pode seguir para a prova final."}
              </p>
              <div className="progress-track" aria-hidden>
                <div className="progress-fill" style={{ width: `${Math.min(100, (scholarshipPaid / 10) * 100)}%` }} />
              </div>
              <p className="text-xs font-semibold text-[var(--surface-text-muted)]">
                {Math.min(scholarshipPaid, 10)} de 10 matrículas pagas
              </p>
            </div>
          </section>
        )}

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
          <article className="rounded-[22px] bg-[var(--brand-blue)] p-5 text-white shadow-[0_22px_55px_-34px_rgba(1,33,105,0.85)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#ffdf00]">Meta da semana</p>
                <p className="mt-3 flex items-end gap-2">
                  <span className="text-4xl font-extrabold tracking-[-0.05em]">{paid}</span>
                  <span className="pb-1 text-sm font-semibold text-white/60">de {goal} matrículas</span>
                </p>
              </div>
              <span className="grid size-12 place-items-center rounded-2xl bg-white/10 text-[#ffdf00]">
                <Target aria-hidden className="size-6" />
              </span>
            </div>
            <div className="mt-5 progress-track bg-white/15" aria-hidden>
              <div className="progress-fill" style={{ width: `${Math.min(100, (paid / Math.max(goal, 1)) * 100)}%` }} />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
              <p className="max-w-md text-white/75">
                {summary.goal_reached
                  ? `Meta atingida. Bônus de ${formatBRL(summary.bonus_amount)} garantido.`
                  : `${remaining === 1 ? "Falta" : "Faltam"} ${remaining} matrícula${remaining === 1 ? "" : "s"} para liberar ${formatBRL(summary.bonus_amount)} de bônus.`}
              </p>
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/85">
                fecha em <Countdown target={summary.next_closing_at} urgentBelowHours={summary.goal_reached ? undefined : 24} />
              </span>
            </div>
          </article>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <article className="metric-card">
              <WalletCards aria-hidden className="mb-3 size-5 text-[var(--brand-green)]" />
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--surface-text-muted)]">Recebido</p>
              <p className="mt-1 text-xl font-extrabold tabular-nums">{formatBRL(summary.lifetime.total_received)}</p>
            </article>
            <article className="metric-card border-l-4 border-l-[var(--brand-yellow)]">
              <CircleDollarSign aria-hidden className="mb-3 size-5 text-[var(--brand-blue)]" />
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--surface-text-muted)]">A receber</p>
              <p className="mt-1 text-xl font-extrabold tabular-nums">
                {formatBRL(Number(summary.week_commission_total) + (summary.goal_reached ? Number(summary.bonus_amount) : 0))}
              </p>
            </article>
          </div>
        </section>

        {me.ref_url && (
          <section className="surface-card flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--brand-green-soft)] text-[var(--brand-green-strong)]">
              <Link2 aria-hidden className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold">Seu link de indicação</p>
              <code className="mt-1 block truncate text-xs text-[var(--surface-text-muted)]">{me.ref_url}</code>
            </div>
            <CopyButton value={me.ref_url} label="Copiar link" />
          </section>
        )}

        <section className="grid gap-3 md:grid-cols-3" aria-label="Resumo da sua operação">
          <DashboardLink href="/leads" icon={Users} label="Indicações" value={String(leads.length)} description={leads.length === 0 ? "Faça sua primeira indicação" : `${waitingLeads} aguardando · ${paidLeads} pagas`} />
          <DashboardLink href="/comissoes" icon={CircleDollarSign} label="Comissões" value={formatBRL(pendingCommissions)} description="Total aguardando pagamento" />
          <DashboardLink href="/conta" icon={UserRound} label="Conta" value="Perfil" description="Dados, documentos e acesso" />
        </section>

        {(leads.length > 0 || commissions.length > 0) && (
          <section className="grid gap-4 lg:grid-cols-2" aria-label="Atividade recente">
            {leads.length > 0 && (
              <article className="surface-card">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-extrabold">Indicações recentes</h2>
                  <Link href="/leads" className="text-sm font-bold text-[var(--brand-green-strong)]">Ver todas</Link>
                </div>
                <ul className="divide-y divide-[var(--surface-border)]">
                  {leads.slice(0, 3).map((lead) => {
                    const state = leadState(lead, weekStart);
                    return (
                      <li key={lead.external_id} className="flex items-center gap-3 py-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--surface-alt)] font-extrabold">{(lead.name || "?").trim().charAt(0).toUpperCase()}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold">{lead.name || "Indicação sem nome"}</span>
                          <span className="text-xs text-[var(--surface-text-muted)]">{new Date(lead.created_at).toLocaleDateString("pt-BR")}</span>
                        </span>
                        <Badge tone={state === "paid_settled" ? "ok" : state === "paid_pending" ? "gold" : "warn"}>{state === "paid_settled" ? "Recebida" : state === "paid_pending" ? "Paga" : "Aguardando"}</Badge>
                      </li>
                    );
                  })}
                </ul>
              </article>
            )}
            {commissions.length > 0 && (
              <article className="surface-card">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-extrabold">Comissões recentes</h2>
                  <Link href="/comissoes" className="text-sm font-bold text-[var(--brand-green-strong)]">Ver todas</Link>
                </div>
                <ul className="divide-y divide-[var(--surface-border)]">
                  {commissions.slice(0, 3).map((commission) => (
                    <li key={commission.external_id} className="flex items-center justify-between gap-3 py-3">
                      <span>
                        <span className="block text-sm font-extrabold">{formatBRL(commission.amount)}</span>
                        <span className="text-xs text-[var(--surface-text-muted)]">{commissionLabel(commission.source)}</span>
                      </span>
                      <Badge tone={commission.status === "paid" ? "ok" : commission.status === "failed" ? "danger" : "muted"}>{commission.status === "paid" ? "Recebida" : commission.status === "failed" ? "Falhou" : "A receber"}</Badge>
                    </li>
                  ))}
                </ul>
              </article>
            )}
          </section>
        )}
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

function DashboardLink({
  href,
  icon: Icon,
  label,
  value,
  description,
}: {
  href: string;
  icon: typeof Users;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <Link href={href} className="surface-card group flex min-h-32 items-center gap-4 transition-colors hover:border-[var(--surface-border-hover)]">
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--surface-alt)] text-[var(--brand-blue)]">
        <Icon aria-hidden className="size-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold uppercase tracking-wide text-[var(--surface-text-muted)]">{label}</span>
        <span className="mt-0.5 block truncate text-xl font-extrabold">{value}</span>
        <span className="mt-1 block text-xs text-[var(--surface-text-muted)]">{description}</span>
      </span>
      <ArrowRight aria-hidden className="size-5 shrink-0 text-[var(--surface-text-muted)] transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
