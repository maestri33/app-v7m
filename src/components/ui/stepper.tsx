import type { CandidateStatus } from "@/lib/api/types";

/** Etapas do funil do candidato, na ordem do backend. */
const FUNNEL_STEPS = [
  { key: "documents", label: "Documento" },
  { key: "address", label: "Comprovante" },
  { key: "pix", label: "Pix" },
  { key: "education", label: "Escolaridade" },
  { key: "selfie", label: "Foto" },
] as const;

type StepKey = (typeof FUNNEL_STEPS)[number]["key"];

/**
 * Indicador de progresso do funil (recomendação ui-ux-pro-max para o padrão
 * "Funnel"). `current` é a etapa visual, independente do status legado do backend.
 */
export function FunnelStepper({ current }: { current: StepKey | CandidateStatus }) {
  const normalized = current === "started" || current === "profile" ? "documents" : current;
  // `completed` = funil inteiro concluído → tudo marcado como feito.
  const idx =
    normalized === "completed"
      ? FUNNEL_STEPS.length
      : FUNNEL_STEPS.findIndex((s) => s.key === normalized);
  const currentIndex = Math.min(Math.max(idx, 0), FUNNEL_STEPS.length - 1);
  const currentLabel = normalized === "completed" ? "Concluído" : FUNNEL_STEPS[currentIndex].label;

  return (
    <nav className="funnel-progress" aria-label="Progresso do cadastro">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-extrabold uppercase tracking-[0.12em] text-[var(--surface-text-muted)]">Cadastro</span>
        <span className="font-bold text-[var(--surface-text)]">
          {normalized === "completed" ? "Concluído" : `Etapa ${currentIndex + 1} de ${FUNNEL_STEPS.length} · ${currentLabel}`}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1.5" aria-hidden>
        {FUNNEL_STEPS.map((step, index) => (
          <span
            key={step.key}
            className="h-1.5 rounded-full"
            style={{
              background:
                index <= idx || normalized === "completed"
                  ? "var(--brand-green)"
                  : "var(--surface-border)",
            }}
          />
        ))}
      </div>
    </nav>
  );
}
