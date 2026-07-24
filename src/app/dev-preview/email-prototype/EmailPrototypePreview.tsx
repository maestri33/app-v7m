"use client";

import { useCallback, useState } from "react";
import {
  PromoterEmailStep,
  type EmailVerificationResult,
} from "@/components/auth/PromoterEmailStep";
import styles from "./EmailPrototypePreview.module.css";

type Scenario = "available" | "taken" | "network";

const scenarioLabels: Record<Scenario, string> = {
  available: "Disponível",
  taken: "Já em uso",
  network: "Erro de rede",
};

function waitForPreview(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, 650);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

export function EmailPrototypePreview() {
  const [scenario, setScenario] = useState<Scenario>("available");
  const [previewSequence, setPreviewSequence] = useState(0);
  const [completedEmail, setCompletedEmail] = useState<string | null>(null);

  const verifyEmail = useCallback(
    async (email: string, signal: AbortSignal): Promise<EmailVerificationResult> => {
      await waitForPreview(signal);

      if (scenario === "network") {
        throw new Error("Preview network failure");
      }

      if (scenario === "taken") {
        return {
          status: "taken",
          message: "Este e-mail já está vinculado a outra conta. Use outro e-mail para continuar.",
        };
      }

      return { status: "available" };
    },
    [scenario],
  );

  function selectScenario(nextScenario: Scenario) {
    setScenario(nextScenario);
    setCompletedEmail(null);
    setPreviewSequence((sequence) => sequence + 1);
  }

  function resetPreview() {
    setCompletedEmail(null);
    setPreviewSequence((sequence) => sequence + 1);
  }

  return (
    <main className={styles.page}>
      <header className={styles.toolbar}>
        <div>
          <p>Componente isolado</p>
          <h2>Reação simulada</h2>
        </div>
        <div className={styles.scenarios} aria-label="Cenário da verificação">
          {(Object.keys(scenarioLabels) as Scenario[]).map((scenarioKey) => (
            <button
              key={scenarioKey}
              type="button"
              aria-pressed={scenario === scenarioKey}
              onClick={() => selectScenario(scenarioKey)}
            >
              {scenarioLabels[scenarioKey]}
            </button>
          ))}
        </div>
      </header>

      <div className={styles.canvas}>
        {completedEmail ? (
          <section className={styles.completed} role="status">
            <span>Fluxo concluído</span>
            <h1>Pronto para integrar</h1>
            <p>{completedEmail}</p>
            <button type="button" onClick={resetPreview}>
              Testar novamente
            </button>
          </section>
        ) : (
          <PromoterEmailStep
            key={previewSequence}
            autoFocus
            verifyEmail={verifyEmail}
            onComplete={setCompletedEmail}
            successDurationMs={1700}
          />
        )}
      </div>
    </main>
  );
}
