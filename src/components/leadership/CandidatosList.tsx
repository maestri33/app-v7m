import { Badge } from "@/components/ui/badge";
import { CardLink } from "@/components/ui/card";

// CandidateAwaitingOut do GET /leadership/candidates (contrato confirmado no
// OpenAPI vivo 2026-06-23): só estes 4 campos são tipados. O resto do perfil
// vem no detalhe (objeto livre), não aqui.
export type CandidateAwaiting = {
  external_id: string;
  name: string | null;
  since: string | null;
  rejected: boolean;
};

function sinceLabel(since: string | null): string | null {
  if (!since) return null;
  const d = new Date(since);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR");
}

/**
 * Fila de candidatos aguardando aprovação. Presentational (sem fetch) — a página
 * server faz o `djangoFetch` e passa `items`; assim a lista também renderiza no
 * /dev-preview com dados falsos, sem backend (manual §1: "ver" telas que dependem
 * de estado).
 */
export function CandidatosList({ items }: { items: CandidateAwaiting[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((c) => {
        const since = sinceLabel(c.since);
        return (
          <li key={c.external_id}>
            <CardLink href={`/coordenador/candidatos/${c.external_id}`}>
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-lg">{c.name ?? "Sem nome"}</h2>
                {c.rejected ? (
                  <Badge tone="danger">Rejeitado</Badge>
                ) : (
                  <Badge tone="warn">Aguardando</Badge>
                )}
              </div>
              {since && (
                <p className="text-sm text-brand-muted mt-1">desde {since}</p>
              )}
            </CardLink>
          </li>
        );
      })}
    </ul>
  );
}
