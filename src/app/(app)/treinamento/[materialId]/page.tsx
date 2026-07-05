import { redirect, notFound } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { djangoFetch } from "@/lib/api/client";
import type { TrainingMaterial } from "@/lib/api/types";
import { readSession } from "@/lib/auth/server";

import { SubmissionForm } from "./SubmissionForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Treinamento" };

type Props = {
  params: Promise<{ materialId: string }>;
};

export default async function MaterialPage({ params }: Props) {
  const { materialId } = await params;
  const session = await readSession();
  if (!session) redirect("/");
  if (!session.roles.includes("training")) redirect("/painel");

  const materials = await djangoFetch<TrainingMaterial[]>(
    "/api/v1/collaborators/training/materials",
  );
  const material = materials.find((m) => m.external_id === materialId);
  if (!material) notFound();

  return (
    <GrainSection className="bg-brand-bg min-h-[60dvh]">
      <Container>
        <PageHeader
          kicker="V7M · Treinamento"
          title={material.title}
          subtitle={<span className="whitespace-pre-line">{material.prompt}</span>}
        />
        <div className="-mt-6 mb-6">
          <Badge tone={material.blocking ? "warn" : "muted"}>
            {material.blocking ? "Obrigatória" : "Extra · opcional"}
          </Badge>
        </div>
        <Card className="max-w-2xl">
          <SubmissionForm
            materialExternalId={material.external_id}
            submissionStatus={material.submission_status ?? null}
          />
        </Card>
      </Container>
    </GrainSection>
  );
}
