"use client";

import { useState } from "react";

import {
  SelfieExperience,
  type SelfieAnalysisResult,
  type SelfieExperienceState,
} from "@/components/selfie-experience";

import styles from "./preview.module.css";

type Scenario = {
  label: string;
  initialState: SelfieExperienceState;
  outcome?: SelfieAnalysisResult;
  cameraBehavior?: "simulated" | "permission-denied" | "unavailable";
};

const SCENARIOS: Scenario[] = [
  { label: "Fluxo completo", initialState: "agreement", outcome: "approved", cameraBehavior: "simulated" },
  { label: "Câmera", initialState: "camera", outcome: "approved", cameraBehavior: "simulated" },
  { label: "Prévia", initialState: "preview", outcome: "approved", cameraBehavior: "simulated" },
  { label: "Analisando", initialState: "analyzing", cameraBehavior: "simulated" },
  { label: "Aprovada", initialState: "approved", cameraBehavior: "simulated" },
  { label: "Foto recusada", initialState: "rejected", cameraBehavior: "simulated" },
  { label: "Análise manual", initialState: "manual-review", cameraBehavior: "simulated" },
  { label: "Sem permissão", initialState: "camera-error", cameraBehavior: "permission-denied" },
  { label: "Sem câmera", initialState: "camera-error", cameraBehavior: "unavailable" },
  { label: "Falha de rede", initialState: "network-error", outcome: "approved", cameraBehavior: "simulated" },
];

export function SelfieExperiencePreview() {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [session, setSession] = useState(0);
  const [event, setEvent] = useState("Aguardando interação");
  const scenario = SCENARIOS[scenarioIndex];

  function chooseScenario(index: number) {
    setScenarioIndex(index);
    setSession((current) => current + 1);
    setEvent(`Cenário aberto: ${SCENARIOS[index].label}`);
  }

  return (
    <main className={styles.screen}>
      <nav className={styles.scenarioDock} aria-label="Cenários da selfie">
        <span>Estado</span>
        {SCENARIOS.map((item, index) => (
          <button
            type="button"
            key={item.label}
            className={index === scenarioIndex ? styles.active : ""}
            onClick={() => chooseScenario(index)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <header className={styles.header}>
        <div><span className={styles.brand}>V7M</span><span /> <strong>Promotor</strong></div>
        <p>Olá, <strong>Maria</strong></p>
      </header>

      <div className={styles.layout}>
        <SelfieExperience
          key={`${scenarioIndex}-${session}`}
          initialState={scenario.initialState}
          cameraBehavior={scenario.cameraBehavior}
          demoOutcome={scenario.outcome}
          analysisDelayMs={1800}
          onComplete={() => setEvent("Componente concluiu o cenário")}
          onBack={() => setEvent("Voltar acionado")}
        />
      </div>

      <footer className={styles.footer}>
        <span><strong>V7M</strong> · Componente independente</span>
        <span>· Estados adversos preservados</span>
        <span className={styles.event} role="status">{event}</span>
      </footer>
    </main>
  );
}
