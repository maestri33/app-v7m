import { redirect } from "next/navigation";
import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { GrainSection } from "@/components/layout/GrainSection";
import { djangoFetch } from "@/lib/api/client";
import { readSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

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
  if (!session) redirect("/entrar");
  if (!session.roles.includes("training")) redirect("/painel");

  const [materials, progress] = await Promise.all([
    djangoFetch<Material[]>("/api/v1/collaborators/training/materials"),
    djangoFetch<Progress>("/api/v1/collaborators/training/progress"),
  ]);

  const answeredSet = new Set(
    (materials as unknown as Array<Material & { last_score?: number | null }>)
      .filter((m) => m.status !== "pending")
      .map((m) => m.external_id),
  );
  void answeredSet; // hint visual futuro

  return (
    <GrainSection className="bg-paper-soft min-h-[60vh]">
      <Container>
        <p className="kicker text-gold-ink">V7M · Treinamento</p>
        <h1 className="mb-3" style={{ fontSize: "var(--text-h2-sm)" }}>
          Suas matérias
        </h1>

        <div className="mb-8 grid gap-3 max-w-2xl sm:grid-cols-3">
          <Stat label="Total" value={String(progress.total)} />
          <Stat label="Respondidas" value={String(progress.answered)} />
          <Stat
            label="Média"
            value={progress.average_score != null ? progress.average_score.toFixed(1) : "—"}
          />
        </div>

        <ul className="space-y-3 max-w-2xl">
          {materials.map((m) => (
            <li key={m.external_id}>
              <Link
                href={`/treinamento/${m.external_id}`}
                className="block rounded-[var(--radius)] border border-line-light/20 bg-white p-5 hover:border-gold transition"
              >
                <h2 className="font-display text-lg">{m.title}</h2>
                <p className="text-sm text-muted-on-light mt-1 line-clamp-2">
                  {m.prompt}
                </p>
                <p className="text-xs uppercase tracking-wider mt-2 text-muted-on-light">
                  {m.status === "pending" ? "Pendente" : "Respondida"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </GrainSection>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-line-light/20 bg-white p-4">
      <p className="text-xs uppercase tracking-wider text-muted-on-light">{label}</p>
      <p className="text-3xl font-display mt-1">{value}</p>
    </div>
  );
}
