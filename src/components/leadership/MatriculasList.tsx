import { Badge } from "@/components/ui/badge";
import { CardLink } from "@/components/ui/card";
import type { HubEnrollmentRow } from "@/lib/api/leadership";

function dateLabel(s: string | null): string | null {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR");
}

// Status vem cru do back; humanizamos os conhecidos e mantemos o valor cru no resto.
function statusLabel(status: string): string {
  switch (status) {
    case "awaiting_release":
      return "Aguardando matrícula";
    case "completed":
      return "Concluída";
    default:
      return status;
  }
}

/**
 * Fila de matrículas do polo. Presentational (sem fetch) — a página server faz o
 * djangoFetch e passa `items`; assim renderiza no /dev-preview com dados falsos,
 * sem backend. Só leitura: a matrícula em si (pagar taxa + concluir) mexe em R$ e
 * credenciais reais → Portão 3, fora daqui.
 */
export function MatriculasList({ items }: { items: HubEnrollmentRow[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((e) => {
        const since = dateLabel(e.created_at);
        const awaiting = e.status === "awaiting_release";
        return (
          <li key={e.external_id}>
            <CardLink href={`/coordenador/matriculas/${e.external_id}`}>
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-lg">{e.name ?? "Sem nome"}</h2>
                <Badge tone={awaiting ? "warn" : "muted"}>{statusLabel(e.status)}</Badge>
              </div>
              {e.phone && <p className="text-sm text-brand-muted mt-1">{e.phone}</p>}
              {since && <p className="text-sm text-brand-muted mt-1">desde {since}</p>}
            </CardLink>
          </li>
        );
      })}
    </ul>
  );
}
