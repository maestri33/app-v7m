import { Card } from "@/components/ui/Card";

function isPrimitive(v: unknown): v is string | number | boolean {
  return typeof v === "string" || typeof v === "number" || typeof v === "boolean";
}

/**
 * Corpo read-only e DEFENSIVO do detalhe do candidato. Presentational: a page
 * server faz o djangoFetch e passa {data, errorCode}; assim o /dev-preview também
 * renderiza com dados falsos, sem backend (manual §1).
 *
 * GET /candidates/{id} é objeto LIVRE (contrato não publicado no OpenAPI) →
 * primitivos de topo num dl, aninhados em JSON cru. As DECISÕES (aprovar/
 * rejeitar/decidir selfie+doc) mexem em identidade/status reais → Portão, fora daqui.
 */
export function CandidatoDetailBody({
  data,
  errorCode,
}: {
  data: Record<string, unknown> | null;
  errorCode: string | null;
}) {
  if (errorCode) {
    return (
      <Card className="text-muted-on-light">
        {errorCode === "CANDIDATE_NOT_FOUND" || errorCode === "NOT_HUB_COORDINATOR"
          ? "Esse candidato não é do seu polo."
          : `Não deu pra carregar o candidato agora (${errorCode}). Atualize a página.`}
      </Card>
    );
  }
  if (!data) {
    return <Card className="text-muted-on-light">Sem dados.</Card>;
  }

  const fields = Object.entries(data).filter(([, v]) => isPrimitive(v));
  const nested = Object.entries(data).filter(([, v]) => !isPrimitive(v) && v != null);

  return (
    <div className="grid gap-4 max-w-2xl">
      {fields.length > 0 && (
        <Card>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {fields.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted-on-light">{k}</dt>
                <dd className="text-black break-words">{String(v)}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}

      {nested.map(([k, v]) => (
        <Card key={k}>
          <h2 className="font-display text-base mb-2">{k}</h2>
          <pre className="overflow-auto rounded border border-line-light bg-paper p-3 text-xs text-black">
            {JSON.stringify(v, null, 2)}
          </pre>
        </Card>
      ))}

      <Card className="text-sm text-muted-on-light">
        Decisões (aprovar, rejeitar, decidir selfie e documento) entram num passo
        dedicado — mexem em identidade e status reais.
      </Card>
    </div>
  );
}
