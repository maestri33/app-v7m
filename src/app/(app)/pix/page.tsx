import { redirect } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { FunnelStepper } from "@/components/ui/stepper";
import { readSession } from "@/lib/auth/server";

import { PixForm } from "./PixForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sua chave Pix" };

type PixSection = {
  key?: string | null;
  key_type?: string | null;
  validated_at?: string | null;
};

export default async function PixPage() {
  const session = await readSession();
  if (!session) redirect("/");
  if (!session.roles.includes("candidate")) redirect("/painel");

  // Pix ainda não vem no me_dict do candidato — o form valida/preenche do zero.
  const initial: PixSection = {};

  return (
    <GrainSection className="bg-brand-bg min-h-[60dvh]">
      <Container>
        <PageHeader
          title="Sua chave Pix"
          subtitle="A chave precisa ser SUA e do mesmo CPF do cadastro. A gente valida no DICT (Asaas) conferindo o titular — isso mexe R$0,01 de verdade."
        />
        <FunnelStepper current="pix" />
        <Card className="max-w-xl">
          <PixForm initial={initial} />
        </Card>
      </Container>
    </GrainSection>
  );
}
