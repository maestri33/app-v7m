import { redirect, notFound } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { djangoFetch } from "@/lib/api/client";
import { readSession } from "@/lib/auth/server";

import { SubmissionForm } from "./SubmissionForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Treinamento" };

type Material = {
  external_id: string;
  title: string;
  prompt: string;
  status: string;
};

type Props = {
  params: Promise<{ materialId: string }>;
};

export default async function MaterialPage({ params }: Props) {
  const { materialId } = await params;
  const session = await readSession();
  if (!session) redirect("/entrar");
  if (!session.roles.includes("training")) redirect("/painel");

  const materials = await djangoFetch<Material[]>(
    "/api/v1/collaborators/training/materials",
  );
  const material = materials.find((m) => m.external_id === materialId);
  if (!material) notFound();

  return (
    <GrainSection className="bg-paper-soft min-h-[60dvh]">
      <Container>
        <PageHeader
          kicker="V7M · Treinamento"
          title={material.title}
          subtitle={<span className="whitespace-pre-line">{material.prompt}</span>}
        />
        <Card className="max-w-2xl">
          <SubmissionForm materialExternalId={material.external_id} status={material.status} />
        </Card>
      </Container>
    </GrainSection>
  );
}
