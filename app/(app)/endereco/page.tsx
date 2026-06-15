import { redirect } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { djangoFetch } from "@/lib/api/client";
import type { AddressSection } from "@/lib/api/types";
import { readSession } from "@/lib/auth/server";

import { EnderecoForm } from "./EnderecoForm";

export const dynamic = "force-dynamic";

export default async function EnderecoPage() {
  const session = await readSession();
  if (!session) redirect("/entrar");
  if (!session.roles.includes("candidate")) redirect("/painel");

  const data = await djangoFetch<AddressSection>(
    "/api/v1/collaborators/candidate/address",
  );

  return (
    <GrainSection className="bg-paper-soft min-h-[60vh]">
      <Container>
        <p className="kicker text-gold-ink">V7M · Promotor</p>
        <h1 className="mb-3" style={{ fontSize: "var(--text-h2-sm)" }}>
          Seu endereço
        </h1>
        <p className="text-muted-on-light mb-8">
          A gente busca o CEP e você só completa o que faltar (número, complemento).
        </p>
        <div className="max-w-xl">
          <EnderecoForm initial={data} />
        </div>
      </Container>
    </GrainSection>
  );
}
