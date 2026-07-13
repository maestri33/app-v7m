import type { CandidateStatus } from "@/lib/api/types";

/** Etapas do funil do candidato, na ordem do backend. */
const FUNNEL_STEPS = [
  { key: "profile", label: "Perfil" },
  { key: "address", label: "Endereço" },
  { key: "documents", label: "Documento" },
  { key: "pix", label: "Pix" },
  { key: "education", label: "Escolaridade" },
  { key: "selfie", label: "Selfie" },
] as const;

type StepKey = (typeof FUNNEL_STEPS)[number]["key"];

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" width="11" height="11" fill="none" aria-hidden>
      <path
        d="M3.5 8.5l3 3 6-7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type StepState = "todo" | "current" | "done";
type StepDef = { key: string; label: string };

/**
 * Stepper genérico — recebe `steps[]` + índice atual.
 * FunnelStepper abaixo é wrapper fino p/ compatibilidade.
 */
export function Stepper({
  steps,
  currentIndex,
  label = "Progresso",
}: {
  steps: StepDef[];
  /** índice do passo atual (0-based). Passos antes são "done", depois "todo". */
  currentIndex: number;
  label?: string;
}) {
  return (
    <nav className="stepper" aria-label={label}>
      {steps.map((s, i) => {
        const state: StepState =
          i < currentIndex ? "done" : i === currentIndex ? "current" : "todo";
        return (
          <span
            key={s.key}
            className="step"
            data-state={state}
            aria-current={state === "current" ? "step" : undefined}
          >
            <span className="step-dot">
              {state === "done" ? <CheckIcon /> : i + 1}
            </span>
            {s.label}
          </span>
        );
      })}
    </nav>
  );
}

/**
 * Indicador de progresso do funil (recomendação ui-ux-pro-max para o padrão
 * "Funnel"). `current` é a etapa atual; `started` é tratado como `profile`.
 * Wrapper fino sobre Stepper genérico.
 */
export function FunnelStepper({ current }: { current: StepKey | CandidateStatus }) {
  const normalized = current === "started" ? "profile" : current;
  const idx =
    normalized === "completed"
      ? FUNNEL_STEPS.length
      : FUNNEL_STEPS.findIndex((s) => s.key === normalized);
  return (
    <Stepper
      steps={FUNNEL_STEPS as unknown as StepDef[]}
      currentIndex={idx < 0 ? 0 : idx}
      label="Progresso do cadastro"
    />
  );
}
