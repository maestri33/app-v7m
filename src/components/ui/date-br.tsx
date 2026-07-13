/**
 * Formata data ISO → pt-BR via Intl.DateTimeFormat.
 * Figuras tabulares p/ não shiftar layout em updates.
 *
 * Uso: <DateBR value="2026-07-13" /> → "13/07/2026"
 *      <DateBR value="2026-07-13" month="long" /> → "13 de julho de 2026"
 *      <DateBR value="2026-07-13T14:30:00Z" time /> → "13/07/2026 às 14:30"
 */
export function DateBR({
  value,
  month = "numeric",
  time = false,
  locale = "pt-BR",
}: {
  value: string; // ISO 8601
  month?: "numeric" | "long";
  time?: boolean;
  locale?: string;
}) {
  const d = new Date(value);

  if (isNaN(d.getTime())) {
    return <span className="tabular-nums whitespace-nowrap text-[var(--surface-text-muted)]">—</span>;
  }

  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month,
    year: "numeric",
    ...(time && { hour: "2-digit", minute: "2-digit" }),
  };

  const fmt = Intl.DateTimeFormat(locale, opts);
  return (
    <span className="tabular-nums whitespace-nowrap">{fmt.format(d)}</span>
  );
}
