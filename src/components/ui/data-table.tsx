import type { ReactNode } from "react";

/**
 * DataTable — tabela com header, linhas e slots de estado.
 * Em casa + Tailwind; TanStack Table só se precisar sort/virtualização.
 *
 * Semântica: `<table>` com `<thead>/<tbody>`, caption opcional.
 * Estados: empty ("Nenhum registro"), loading (skeleton), error (retry).
 */

type Column<T> = {
  key: string;
  header: string;
  /** classe opcional p/ coluna (ex: "text-right", "w-32") */
  className?: string;
  render: (row: T) => ReactNode;
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  keyFn: (row: T) => string | number;
  /** slot opcional acima da tabela (filtro, busca) */
  filter?: ReactNode;
  /** estado */
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyMessage?: string;
  /** caption acessível */
  caption?: string;
};

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  keyFn,
  filter,
  loading = false,
  error = null,
  onRetry,
  emptyMessage = "Nenhum registro encontrado.",
  caption,
}: Props<T>) {
  return (
    <div className="w-full">
      {filter && <div className="mb-4">{filter}</div>}

      {error ? (
        <div
          role="alert"
          className="rounded-[var(--radius)] border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-4 text-center"
        >
          <p className="text-sm font-medium text-[var(--danger)] mb-2">
            {error}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-sm font-semibold text-[var(--danger)] underline hover:no-underline"
            >
              Tentar novamente
            </button>
          )}
        </div>
      ) : loading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Carregando dados...">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-10 rounded-[var(--radius)] bg-[var(--surface-border)] animate-pulse"
            />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-[var(--surface-border)] bg-[var(--surface)] p-8 text-center">
          <p className="text-sm text-[var(--surface-text-muted)]">
            {emptyMessage}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius)] border border-[var(--surface-border)]">
          <table className="w-full text-sm" aria-label={caption ?? "Tabela de dados"}>
            {caption && <caption className="sr-only">{caption}</caption>}
            <thead>
              <tr className="border-b border-[var(--surface-border)] bg-[var(--surface-alt)]">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--surface-text-muted)] ${col.className ?? ""}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--surface-border)]">
              {rows.map((row) => (
                <tr
                  key={keyFn(row)}
                  className="bg-[var(--surface)] hover:bg-[var(--surface-alt)] transition-colors"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-[var(--surface-text)] ${col.className ?? ""}`}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
