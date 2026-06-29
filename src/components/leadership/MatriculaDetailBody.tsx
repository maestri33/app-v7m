import { Card } from "@/components/ui/card";

function isPrimitive(v: unknown): v is string | number | boolean {
  return typeof v === "string" || typeof v === "number" || typeof v === "boolean";
}

/**
 * Detalhe da matrícula — read-only e DEFENSIVO. GET /enrollments/{id} é objeto
 * LIVRE (sem schema no OpenAPI): primitivos de topo num dl, seções aninhadas em
 * JSON cru. Presentational: a page faz o djangoFetch e passa {data, errorCode},
 * então o /dev-preview também renderiza com dados falsos.
 *
 * As AÇÕES — pagar a taxa (2 parcelas) e concluir (gera login/senha da plataforma
 * do aluno) — mexem em dinheiro e credenciais reais → Portão 3, fora daqui.
 */
export function MatriculaDetailBody({
  data,
  errorCode,
}: {
  data: Record<string, unknown> | null;
  errorCode: string | null;
}) {
  if (errorCode) {
    return (
      <Card className="text-brand-muted">
        {errorCode === "ENROLLMENT_NOT_FOUND" || errorCode === "NOT_HUB_COORDINATOR"
          ? "Essa matrícula não é do seu polo."
          : `Não deu pra carregar a matrícula agora (${errorCode}). Atualize a página.`}
      </Card>
    );
  }
  if (!data) {
    return <Card className="text-brand-muted">Sem dados.</Card>;
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
                <dt className="text-brand-muted">{k}</dt>
                <dd className="text-brand-ink break-words">{String(v)}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}

      {nested.map(([k, v]) => (
        <Card key={k}>
          <h2 className="font-display text-base mb-2">{k}</h2>
          <pre className="overflow-auto rounded border border-brand-border bg-brand-bg p-3 text-xs text-brand-ink">
            {JSON.stringify(v, null, 2)}
          </pre>
        </Card>
      ))}

      <Card className="text-sm text-brand-muted">
        Fazer a matrícula — pagar a taxa (2 parcelas) e concluir, gerando o login da
        plataforma do aluno — mexe em dinheiro e credenciais reais e entra num passo
        dedicado.
      </Card>
    </div>
  );
}
