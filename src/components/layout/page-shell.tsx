import type { ReactNode } from "react";

/**
 * PageShell — wrapper de página para o conteúdo do fit-viewport. Substitui o
 * GrainSection + Container antigos (o shell já provê fundo/padding).
 */
export function PageShell({
  children,
  width = "default",
}: {
  children: ReactNode;
  /** `narrow` = max-w-md (telas de candidato); `default` = max-w-2xl */
  width?: "default" | "narrow";
}) {
  return (
    <div className={width === "narrow" ? "page-shell page-shell-narrow" : "page-shell"}>
      {children}
    </div>
  );
}

/**
 * CompactHeader — cabeçalho de página compacto (sem o mb-8 do PageHeader
 * antigo, alinhado ao fit-viewport).
 */
export function CompactHeader({
  kicker,
  title,
  subtitle,
}: {
  kicker?: string;
  title: string;
  subtitle?: ReactNode;
}) {
  return (
    <header className="page-heading">
      {kicker && (
        <p className="section-label">
          {kicker}
        </p>
      )}
      <h1 className="page-title text-[var(--surface-text)]">{title}</h1>
      {subtitle && (
        <p className="max-w-2xl text-[0.95rem] leading-relaxed text-[var(--surface-text-muted)]">{subtitle}</p>
      )}
    </header>
  );
}
