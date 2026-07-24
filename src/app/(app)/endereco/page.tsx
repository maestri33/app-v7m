import { redirect } from "next/navigation";

import { FunnelStepper } from "@/components/ui/stepper";
import { CompactHeader, PageShell } from "@/components/layout/page-shell";
import { djangoFetch } from "@/lib/api/client";
import type { CandidateMe } from "@/lib/api/types";
import { candidateStageHref } from "@/lib/candidate/funnel";
import { readSession } from "@/lib/auth/server";

import { AddressProofSection } from "./AddressProofSection";

export const dynamic = "force-dynamic";
export const metadata = { title: "Comprovante de residência" };

export default async function EnderecoPage() {
  const session = await readSession();
  if (!session) redirect("/");
  if (!session.roles.includes("candidate")) redirect("/painel");

  const me = await djangoFetch<CandidateMe>("/api/v1/collaborators/candidate/me");
  const target = candidateStageHref(me);
  if (target !== "/endereco") redirect(target);

  return (
    <PageShell>
      <CompactHeader
        kicker="V7M · Cadastro"
        title="Comprovante de residência"
        subtitle="Envie a conta ou comprovante. O endereço sai do documento — sem digitar CEP, rua ou número."
      />
      <FunnelStepper current="address" />
      <div className="auth-card">
        <AddressProofSection initial={me.address_proof ?? null} />
      </div>
    </PageShell>
  );
}
