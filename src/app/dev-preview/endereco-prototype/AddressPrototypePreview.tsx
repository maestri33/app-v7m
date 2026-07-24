"use client";

import { useCallback, useState } from "react";

import { AddressProofExperience, type AddressProofSubmission } from "@/components/address/AddressProofExperience";

import styles from "./addressPrototypePreview.module.css";

type Scenario = "success" | "network" | "rejected";

const scenarioLabels: Record<Scenario, string> = {
  success: "Sucesso",
  network: "Falha de rede",
  rejected: "Documento recusado",
};

function waitForPreview(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, 850);
    signal.addEventListener("abort", () => {
      window.clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}

export function AddressPrototypePreview() {
  const [scenario, setScenario] = useState<Scenario>("success");
  const [sequence, setSequence] = useState(0);
  const [completed, setCompleted] = useState(false);

  const submitProof = useCallback(async ({ signal }: AddressProofSubmission) => {
    await waitForPreview(signal);
    if (scenario === "network") throw new Error("A conexão caiu durante o envio. Tente novamente — o arquivo continua selecionado.");
    if (scenario === "rejected") throw new Error("A imagem está cortada ou com reflexo. Mostre os quatro cantos do comprovante.");
  }, [scenario]);

  function reset(nextScenario = scenario) {
    setScenario(nextScenario);
    setCompleted(false);
    setSequence((value) => value + 1);
  }

  return (
    <main className={styles.page}>
      <header className={styles.toolbar}>
        <div><p>Componente isolado</p><h2>Endereço · reações simuladas</h2></div>
        <div className={styles.scenarios} aria-label="Cenário do envio">
          {(Object.keys(scenarioLabels) as Scenario[]).map((scenarioKey) => (
            <button key={scenarioKey} type="button" aria-pressed={scenario === scenarioKey} onClick={() => reset(scenarioKey)}>{scenarioLabels[scenarioKey]}</button>
          ))}
        </div>
      </header>
      <div className={styles.canvas}>
        {completed ? (
          <section className={styles.completed} role="status">
            <span>Fluxo concluído</span><h1>Endereço encaminhado</h1><p>O próximo passo pode abrir sem aguardar a análise documental.</p>
            <button type="button" onClick={() => reset()}>Testar novamente</button>
          </section>
        ) : (
          <AddressProofExperience key={sequence} onSubmit={submitProof} onComplete={() => setCompleted(true)} onBack={() => reset()} successDurationMs={1000} />
        )}
      </div>
    </main>
  );
}
