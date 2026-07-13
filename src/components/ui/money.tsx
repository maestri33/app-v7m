/**
 * Formata valor monetário em reais (pt-BR) via Intl.NumberFormat.
 * Figuras tabulares (tabular-nums) p/ não shiftar layout em updates.
 *
 * Uso: <Money value={123456} /> → "R$ 1.234,56" (cents implícitos)
 */
export function Money({
  value,
  currency = "BRL",
  locale = "pt-BR",
}: {
  /** valor em centavos (padrão backend Django: integer) */
  value: number;
  currency?: string;
  locale?: string;
}) {
  const fmt = Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <span className="tabular-nums whitespace-nowrap">
      {fmt.format(value / 100)}
    </span>
  );
}
