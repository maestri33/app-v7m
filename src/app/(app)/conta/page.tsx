import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { LogoutButton } from "@/app/(app)/LogoutButton";
import { djangoFetch } from "@/lib/api/client";
import type { CandidateMe, PromoterMe } from "@/lib/api/types";
import { roleLabels } from "@/lib/candidate/labels";
import { maskCpf, maskPhone, maskPixKey } from "@/lib/format";
import { readUnlockedSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export const metadata = { title: "Conta" };

// Estado de análise em pt-BR (enum cru nunca chega ao usuário).
const DOC_STATUS_LABEL: Record<string, string> = {
  approved: "verificado ✓",
  pending: "em análise",
  review: "em revisão",
  rejected: "reprovado",
};

/**
 * Conta do promotor/candidato: identidade + o que está cadastrado (tudo
 * mascarado) + papéis ativos amigáveis + sair. Dados de `whoami` +
 * `candidate/me` + `promoter/me`, cada um só quando a role permite.
 */
export default async function ContaPage() {
  const session = await readUnlockedSession();
  if (!session) redirect("/");

  const [me, promoter] = await Promise.all([
    session.roles.includes("candidate")
      ? djangoFetch<CandidateMe>("/api/v1/collaborators/candidate/me").catch(() => null)
      : Promise.resolve(null),
    session.roles.includes("promoter")
      ? djangoFetch<PromoterMe>("/api/v1/collaborators/promoter/me").catch(() => null)
      : Promise.resolve(null),
  ]);

  const doc = me?.documents ?? null;
  const address = me?.address ?? null;
  const takenAt = me?.selfie?.taken_at ?? null;
  const signatureVerified = me?.selfie?.analysis_status === "approved";
  const pixKey = promoter?.pix_key ?? me?.pix?.key ?? null;
  const labels = roleLabels(session.roles);
  const initials = (session.name ?? "V7M")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <GrainSection className="bg-brand-bg min-h-[60dvh]">
      <Container>
        <PageHeader kicker="V7M · Você" title="Sua conta" />

        <div className="max-w-2xl space-y-4">
          {/* Identidade */}
          <div className="card flex items-center gap-4">
            <div
              aria-hidden
              className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[image:var(--gold-grad)] font-display text-lg text-brand-ink"
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className="font-display text-lg truncate">{session.name ?? "—"}</p>
              <p className="text-sm text-brand-muted flex flex-wrap items-center gap-2">
                {promoter && (
                  <Badge tone={promoter.status === "active" ? "ok" : "danger"}>
                    {promoter.status === "active" ? "Ativo" : "Suspenso"}
                  </Badge>
                )}
                <span>
                  {labels.join(" · ") || "—"}
                  {signatureVerified ? " · assinatura verificada ✓" : ""}
                </span>
              </p>
            </div>
          </div>

          {/* Cadastro */}
          <div className="space-y-2">
            {session.phone != null && (
              <Row label="Telefone (WhatsApp)">{maskPhone(session.phone)}</Row>
            )}
            {session.cpf != null && <Row label="CPF">{maskCpf(session.cpf)}</Row>}
            {doc?.doc_type && (
              <Row label="Documento">
                {doc.doc_type.toUpperCase()}
                {doc.analysis_status
                  ? ` · ${DOC_STATUS_LABEL[doc.analysis_status] ?? "—"}`
                  : ""}
              </Row>
            )}
            {address?.city && (
              <Row label="Endereço">
                {address.city}
                {address.state ? ` / ${address.state}` : ""}
              </Row>
            )}
            {pixKey && <Row label="Chave Pix">{maskPixKey(pixKey)} · validada ✓</Row>}
            {takenAt && (
              <Row label="Selfie assinada em">
                {new Date(takenAt).toLocaleString("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </Row>
            )}
            <Row label="Papéis ativos">{labels.join(" · ") || "—"}</Row>
          </div>

          <LogoutButton className="inline-flex items-center justify-center rounded-full border border-brand-border bg-brand-surface px-6 py-3 text-sm font-semibold text-brand-muted transition-colors hover:border-danger hover:text-danger" />
        </div>
      </Container>
    </GrainSection>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="card flex items-center justify-between gap-4 py-3.5">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-sm text-brand-muted text-right">{children}</p>
    </div>
  );
}
