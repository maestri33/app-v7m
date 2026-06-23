import { redirect } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { Badge } from "@/components/ui/Badge";
import { Card, CardLink } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Stat } from "@/components/ui/Stat";
import { djangoFetch } from "@/lib/api/client";
import { readSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export const metadata = { title: "Treinamento" };

type Material = {
  external_id: string;
  title: string;
  prompt: string;
  status: string;
};

type Progress = {
  total: number;
  answered: number;
  average_score: number | null;
  pending_external_ids: string[];
};

export default async function TreinamentoPage() {
  const session = await readSession();
  if (!session) redirect("/");
  if (!session.roles.includes("training")) redirect("/painel");

  const [materials, progress] = await Promise.all([
    djangoFetch<Material[]>("/api/v1/collaborators/training/materials"),
    djangoFetch<Progress>("/api/v1/collaborators/training/progress"),
  ]);

  return (
    <GrainSection className="bg-paper-soft min-h-[60dvh]">
      <Container>
        <PageHeader
          kicker="V7M · Treinamento"
          title="Suas matérias"
          subtitle="Conclua o treinamento para liberar o painel de promotor. Vale para o curso inicial e para atualizações ou recados obrigatórios."
        />

        <div className="mb-8 grid gap-3 max-w-2xl sm:grid-cols-3">
          <Stat label="Total" value={String(progress.total)} size="xl" />
          <Stat label="Respondidas" value={String(progress.answered)} size="xl" />
          <Stat
            label="Média"
            value={progress.average_score != null ? progress.average_score.toFixed(1) : "—"}
            size="xl"
          />
        </div>

        {materials.length === 0 ? (
          <Card className="max-w-2xl text-muted-on-light">
            Nenhuma matéria disponível ainda. Volte em breve.
          </Card>
        ) : (
          <ul className="space-y-3 max-w-2xl">
            {materials.map((m) => (
              <li key={m.external_id}>
                <CardLink href={`/treinamento/${m.external_id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-display text-lg">{m.title}</h2>
                    <Badge tone={m.status === "pending" ? "muted" : "ok"}>
                      {m.status === "pending" ? "Pendente" : "Respondida"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-on-light mt-1 line-clamp-2">
                    {m.prompt}
                  </p>
                </CardLink>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </GrainSection>
  );
}
