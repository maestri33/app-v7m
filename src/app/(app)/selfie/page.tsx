import { redirect } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { FunnelStepper } from "@/components/ui/stepper";
import { readSession } from "@/lib/auth/server";

import { SelfieForm } from "./SelfieForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Sua selfie" };

export default async function SelfiePage() {
  const session = await readSession();
  if (!session) redirect("/");
  if (!session.roles.includes("candidate")) redirect("/painel");

  return (
    <GrainSection className="bg-brand-bg min-h-[60dvh]">
      <Container>
        <PageHeader
          title="Sua selfie"
          subtitle="Foto ao vivo, sem óculos escuros. A IA confere a vivacidade e compara com o rosto do documento. Se reprovar, ela te explica como refazer."
        />
        <FunnelStepper current="selfie" />
        <Card className="max-w-xl">
          <SelfieForm />
        </Card>
      </Container>
    </GrainSection>
  );
}
