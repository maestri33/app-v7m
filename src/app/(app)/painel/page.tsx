import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { Countdown } from "@/components/ui/countdown";
import { readUnlockedSession } from "@/lib/auth/server";
import { isOnboarding, isPromoter, OUTSIDE_APP_URL } from "@/lib/auth/roles";
import { stageHref } from "@/lib/candidate/funnel";
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
      return (
        <PanelCard>
          <PanelTitle>Cadastro completo!</PanelTitle>
          <PanelSub>Aguardando aprovação do polo.</PanelSub>
          <PanelBody>
            Recebemos seu perfil, documento, Pix e selfie. O coordenador do polo
            confere e libera — quando aprovar, o treinamento aparece aqui.
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
    const href = stageHref(me.status);
    // Status DESCONHECIDO (o backend ganhou um status que este build não conhece)
    // → stageHref cai em "/painel"; redirecionar pra própria rota é LOOP infinito
    // (ERR_TOO_MANY_REDIRECTS — já aconteceu quando `education` nasceu só no back).
    // Em vez de travar a pessoa, mostra um card neutro; o funil segue quando o
    // build acompanhar o backend.
    if (href === "/painel") {
      return (
        <PanelCard>
          <PanelTitle>Tudo certo por aqui 👍</PanelTitle>
          <PanelSub>Estamos preparando o seu próximo passo.</PanelSub>
          <PanelBody>
            Seu cadastro está em andamento. Se esta tela ficar parada, atualize a
            página ou volte daqui a pouco — nada foi perdido.
          </PanelBody>
        </PanelCard>
      );
    }
    redirect(href);
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
    const heroEmoji =
      paid >= goal ? "🏆" : paid >= Math.ceil(goal * 0.6) ? "⚡" : paid >= 1 ? "🔥" : "🌱";

    return (
      <div className="space-y-4">
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