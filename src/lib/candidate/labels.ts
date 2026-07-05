/** Rótulos pt-BR de valores canônicos do backend (regra §12: enum cru nunca chega ao usuário). */

export const MARITAL_OPTIONS = [
  { value: "", label: "—" },
  { value: "single", label: "Solteiro(a)" },
  { value: "married", label: "Casado(a)" },
  { value: "divorced", label: "Divorciado(a)" },
  { value: "widowed", label: "Viúvo(a)" },
  { value: "separated", label: "Separado(a)" },
] as const;

export function maritalLabel(value: string | null | undefined): string {
  return MARITAL_OPTIONS.find((o) => o.value === (value ?? ""))?.label ?? "—";
}
