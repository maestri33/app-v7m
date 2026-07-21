import { redirect } from "next/navigation";

import { FunnelStepper } from "@/components/ui/stepper";
import { ReadOnlyField } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { CompactHeader, PageShell } from "@/components/layout/page-shell";
import { djangoFetch } from "@/lib/api/client";
import type { AddressSection, CandidateMe } from "@/lib/api/types";
import { candidateStageHref, stageCompleted } from "@/lib/candidate/funnel";
import { readSession } from "@/lib/auth/server";

import { AddressProofSection } from "./AddressProofSection";
import { EnderecoForm } from "./EnderecoForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Seu endereço" };

export default async function EnderecoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await readSession();
  if (!session) redirect("/");
  if (!session.roles.includes("candidate")) redirect("/painel");
  const sp = await searchParams;

  const [me, data] = await Promise.all([
    djangoFetch<CandidateMe>("/api/v1/collaborators/candidate/me"),
    djangoFetch<AddressSection>("/api/v1/collaborators/candidate/address"),
  ]);

  // Etapa já concluída → resumo somente-leitura + CTA pro passo atual.
  if (stageCompleted("address", me)) {
    return (
      <PageShell>
        <CompactHeader kicker="V7M · Cadastro" title="Seu endereço" />
        <FunnelStepper current={me.status} />
        <div className="auth-card space-y-5">
          <div className="banner banner-ok" role="status">
            <p className="font-display">Endereço confirmado ✓</p>
          </div>
          <ReadOnlyField label="CEP" value={data.zipcode ?? "—"} />
          <ReadOnlyField label="Rua" value={data.street ?? "—"} />
          <div className="grid grid-cols-2 gap-3">
            <ReadOnlyField label="Número" value={data.number ?? "—"} />
            <ReadOnlyField label="Complemento" value={data.complement ?? "—"} />
          </div>
          <ReadOnlyField label="Bairro" value={data.neighborhood ?? "—"} />
          <div className="grid grid-cols-3 gap-3">
            <ReadOnlyField className="col-span-2" label="Cidade" value={data.city ?? "—"} />
            <ReadOnlyField label="UF" value={data.state ?? "—"} />
          </div>
          <Button href={candidateStageHref(me)} size="xl" className="w-full">
            Continuar
          </Button>
        </div>
      </PageShell>
    );
  }

  // Endereço preenchido mas ainda em `profile` = falta o COMPROVANTE aprovado
  // (gate real do back). Sub-passo obrigatório, no lugar certo do funil.
  // `?editar=1` reabre o form (ex.: comprovante reprovou porque o ENDEREÇO
  // estava errado — sem isso a pessoa não teria como corrigi-lo).
  const addressComplete = (data.missing_fields ?? []).length === 0;
  const editing = sp.editar === "1";
  if (!editing && addressComplete && (me.status === "profile" || me.status === "started")) {
    return (
      <PageShell>
        <CompactHeader
          kicker="V7M · Cadastro"
          title="Comprovante de residência"
          subtitle="Falta só confirmar seu endereço com um comprovante — a análise é automática e leva menos de um minuto."
        />
        <FunnelStepper current="address" />
        <div className="auth-card">
          <AddressProofSection initial={me.address_proof ?? null} />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <CompactHeader
        kicker="V7M · Cadastro"
        title="Seu endereço"
        subtitle="A gente busca o CEP e você só completa o que faltar (número, complemento)."
      />
      <FunnelStepper current="address" />
      <div className="auth-card">
        <EnderecoForm initial={data} />
      </div>
    </PageShell>
  );
}
