import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { StudentDetail } from "@/lib/api/leadership";

function docStatusTone(s: string): "ok" | "danger" | "warn" | "muted" {
  if (s === "approved") return "ok";
  if (s === "rejected") return "danger";
  if (s === "review" || s === "pending") return "warn";
  return "muted";
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="contents">
      <dt className="text-brand-muted">{label}</dt>
      <dd className="text-brand-ink break-words">{value}</dd>
    </div>
  );
}

function moneyBR(cents: number | null | undefined): string | null {
  if (typeof cents !== "number") return null;
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Detalhe do aluno — TIPADO em `HubStudentDetailOut` (api/leadership.py). Render
 * read-only de docs/pendências/diploma/plataforma/identidade. Presentational: a
 * page server faz o djangoFetch e passa {data, errorCode}; o /dev-preview também
 * renderiza com dados falsos, sem backend. As decisões vivem no `AlunoActions`.
 */
export function AlunoDetailBody({
  data,
  errorCode,
}: {
  data: StudentDetail | null;
  errorCode: string | null;
}) {
  if (errorCode) {
    return (
      <Card className="text-brand-muted">
        {errorCode === "STUDENT_NOT_FOUND" || errorCode === "NOT_HUB_COORDINATOR"
          ? "Esse aluno não é do seu polo."
          : `Não deu pra carregar o aluno agora (${errorCode}). Atualize a página.`}
      </Card>
    );
  }
  if (!data) {
    return <Card className="text-brand-muted">Sem dados.</Card>;
  }

  const u = data.user ?? { external_id: "" };
  const openPendencies = data.pendencies.filter((p) => !p.resolved);

  return (
    <div className="grid gap-4 max-w-2xl">
      {/* Identidade */}
      <Card>
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-lg">{u.name ?? "Aluno"}</h2>
          <Badge tone="muted">{data.status}</Badge>
        </div>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <Row label="CPF" value={u.cpf} />
          <Row label="Telefone" value={u.phone} />
          <Row label="E-mail" value={u.email} />
          <Row label="Tipo sanguíneo" value={data.blood_type} />
          <Row label="Autoestudo" value={data.self_study ? "Sim" : "Não"} />
        </dl>
      </Card>

      {/* Plataforma parceira */}
      <Card>
        <h2 className="font-display text-base mb-2">Plataforma parceira</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <Row label="URL" value={data.platform.url} />
          <Row label="Login" value={data.platform.login} />
          <Row label="Senha" value={data.platform.password} />
          <Row label="Notas" value={data.platform.notes} />
        </dl>
      </Card>

      {/* Documentos */}
      <Card>
        <h2 className="font-display text-base mb-2">Documentos</h2>
        {data.documents.length === 0 ? (
          <p className="text-sm text-brand-muted">Nenhum documento enviado.</p>
        ) : (
          <ul className="grid gap-2">
            {data.documents.map((d) => (
              <li
                key={d.doc_type}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="text-brand-ink">{d.doc_type}</span>
                <Badge tone={docStatusTone(d.validation_status)}>
                  {d.validation_status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-brand-muted">
          A decisão de documento em revisão é feita pela fila de Revisões (ela leva o
          documento específico). Aqui é só leitura do estado.
        </p>
      </Card>

      {/* Pendências */}
      <Card>
        <h2 className="font-display text-base mb-2">Pendências</h2>
        {openPendencies.length === 0 ? (
          <p className="text-sm text-brand-muted">Nenhuma pendência em aberto.</p>
        ) : (
          <ul className="grid gap-3">
            {openPendencies.map((p) => {
              const amount = moneyBR(p.amount_cents);
              return (
                <li key={p.external_id} className="text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-brand-ink">{p.description}</span>
                    <Badge tone="warn">{p.kind}</Badge>
                  </div>
                  {amount && (
                    <p className="text-brand-muted mt-1">Valor de referência: {amount}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Diploma */}
      <Card>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-base">Diploma</h2>
          <Badge tone={data.diploma ? "ok" : "muted"}>
            {data.diploma ? "Emitido" : "Não emitido"}
          </Badge>
        </div>
        {data.diploma && (
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <Row label="Emitido em" value={data.diploma.issued_at} />
            <Row label="Retirado" value={data.diploma.picked_up ? "Sim" : "Não"} />
          </dl>
        )}
      </Card>
    </div>
  );
}
