import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { CandidateDetail } from "@/lib/api/leadership";

function isPrimitive(v: unknown): v is string | number | boolean {
  return typeof v === "string" || typeof v === "number" || typeof v === "boolean";
}

// Campos de topo com layout próprio; qualquer outro (index signature do back) cai
// no card "Outros" — render defensivo pra nunca esconder dado novo do candidato.
const KNOWN = new Set([
  "external_id",
  "status",
  "user",
  "doc_type",
  "mother_name",
  "father_name",
  "marital_status",
  "birthplace",
  "nationality",
  "pix_key",
  "pix_key_type",
  "pix_validated",
  "selfie_status",
  "selfie_image",
  "selfie_description",
]);

function selfieTone(s: string): "ok" | "danger" | "warn" | "muted" {
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

/**
 * Detalhe do candidato — agora TIPADO em `CandidateDetailOut` (contrato no OpenAPI
 * vivo 2026-06-23). Presentational: a page server faz o djangoFetch e passa
 * {data, errorCode}; o /dev-preview renderiza com dados falsos, sem backend.
 * Decisões (aprovar/rejeitar/selfie/documento) vivem no `CandidatoActions`.
 */
export function CandidatoDetailBody({
  data,
  errorCode,
}: {
  data: CandidateDetail | null;
  errorCode: string | null;
}) {
  if (errorCode) {
    return (
      <Card className="text-brand-muted">
        {errorCode === "CANDIDATE_NOT_FOUND" || errorCode === "NOT_HUB_COORDINATOR"
          ? "Esse candidato não é do seu polo."
          : `Não deu pra carregar o candidato agora (${errorCode}). Atualize a página.`}
      </Card>
    );
  }
  if (!data) {
    return <Card className="text-brand-muted">Sem dados.</Card>;
  }

  const u = data.user ?? {};
  const extras = Object.entries(data).filter(([k, v]) => !KNOWN.has(k) && v != null);

  return (
    <div className="grid gap-4 max-w-2xl">
      {/* Identidade */}
      <Card>
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-lg">{u.name ?? "Candidato"}</h2>
          <Badge tone={data.status === "completed" ? "warn" : "muted"}>{data.status}</Badge>
        </div>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <Row label="CPF" value={u.cpf} />
          <Row label="Telefone" value={u.phone} />
          <Row label="E-mail" value={u.email} />
          <Row label="Nascimento" value={u.birth_date} />
        </dl>
      </Card>

      {/* Dados pessoais */}
      <Card>
        <h2 className="font-display text-base mb-2">Dados pessoais</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <Row label="Documento" value={data.doc_type} />
          <Row label="Mãe" value={data.mother_name} />
          <Row label="Pai" value={data.father_name} />
          <Row label="Estado civil" value={data.marital_status} />
          <Row label="Naturalidade" value={data.birthplace} />
          <Row label="Nacionalidade" value={data.nationality} />
        </dl>
      </Card>

      {/* Pix */}
      <Card>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-base">Pix</h2>
          <Badge tone={data.pix_validated ? "ok" : "muted"}>
            {data.pix_validated ? "Validado" : "Não validado"}
          </Badge>
        </div>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <Row label="Chave" value={data.pix_key} />
          <Row label="Tipo" value={data.pix_key_type} />
        </dl>
      </Card>

      {/* Selfie */}
      <Card>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-base">Selfie</h2>
          <Badge tone={selfieTone(data.selfie_status)}>{data.selfie_status}</Badge>
        </div>
        {data.selfie_description && (
          <p className="mt-2 text-sm text-brand-muted">{data.selfie_description}</p>
        )}
        {data.selfie_image && (
          // eslint-disable-next-line @next/next/no-img-element -- selfie é data-uri/URL do back; next/image exigiria allowlist remota
          <img
            src={data.selfie_image}
            alt="Selfie do candidato"
            className="mt-3 max-h-64 w-auto rounded-lg border border-brand-border"
          />
        )}
      </Card>

      {/* Outros (defensivo — campos extras do back sem layout próprio) */}
      {extras.length > 0 && (
        <Card>
          <h2 className="font-display text-base mb-2">Outros</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {extras.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-brand-muted">{k}</dt>
                <dd className="text-brand-ink break-words">
                  {isPrimitive(v) ? String(v) : JSON.stringify(v)}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      )}
    </div>
  );
}
