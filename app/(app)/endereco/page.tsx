import { redirect } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { FunnelStepper } from "@/components/ui/Stepper";
import { djangoFetch } from "@/lib/api/client";
import type { AddressSection } from "@/lib/api/types";
import { readSession } from "@/lib/auth/server";

import { EnderecoForm } from "./EnderecoForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Seu endereço" };

export default async function EnderecoPage() {
  const session = await readSession();
  if (!session) redirect("/");
  if (!session.roles.includes("candidate")) redirect("/painel");

  const data = await djangoFetch<AddressSection>(
    "/api/v1/collaborators/candidate/address",
  );

  return (
    <GrainSection className="bg-paper-soft min-h-[60dvh]">
      <Container>
        <PageHeader
          title="Seu endereço"
          subtitle="A gente busca o CEP e você só completa o que faltar (número, complemento)."
        />
        <FunnelStepper current="address" />
        <Card className="max-w-xl">
          <EnderecoForm initial={data} />
        </Card>
      </Container>
    </GrainSection>
  );
}
