import { Badge } from "@/components/ui/badge";
import { CardLink } from "@/components/ui/card";
import type { HubStudentRow } from "@/lib/api/leadership";

function dateLabel(s: string | null): string | null {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR");
}

// Status vem cru do back; humanizamos os conhecidos e mantemos o valor cru no resto.
function statusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Ativo";
    case "pending":
      return "Com pendência";
    case "exam":
      return "Em prova";
    case "documentation":
      return "Documentação";
    case "awaiting_diploma":
      return "Aguardando diploma";
    case "diploma_issued":
      return "Diploma emitido";
    case "completed":
      return "Concluído";
    default:
      return status;
  }
}

function statusTone(status: string): "ok" | "danger" | "warn" | "muted" {
  if (status === "pending") return "danger";
  if (status === "completed" || status === "diploma_issued") return "ok";
  if (status === "active") return "muted";
  return "warn";
}

/**
 * Fila de alunos do polo. Presentational (sem fetch) — a página server faz o
 * djangoFetch e passa `items`; assim renderiza no /dev-preview com dados falsos,
 * sem backend. As decisões (prova/documento/pendência/diploma) mexem em
 * identidade/status reais → confirmação em 2 passos no AlunoActions, Portão 3.
 */
export function AlunosList({ items }: { items: HubStudentRow[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((s) => {
        const since = dateLabel(s.created_at);
        return (
          <li key={s.external_id}>
            <CardLink href={`/coordenador/alunos/${s.external_id}`}>
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-lg">{s.name ?? "Sem nome"}</h2>
                <Badge tone={statusTone(s.status)}>{statusLabel(s.status)}</Badge>
              </div>
              {s.phone && <p className="text-sm text-brand-muted mt-1">{s.phone}</p>}
              {since && <p className="text-sm text-brand-muted mt-1">desde {since}</p>}
            </CardLink>
          </li>
        );
      })}
    </ul>
  );
}
