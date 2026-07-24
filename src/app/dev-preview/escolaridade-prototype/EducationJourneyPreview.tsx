"use client";

import { useState } from "react";

import { EducationJourney, type EducationJourneyValue } from "@/components/education-journey";
import styles from "./EducationJourneyPreview.module.css";

const CITIES = [
  { name: "Ponta Grossa", uf: "PR", ibgeCode: "4119905" },
  { name: "Curitiba", uf: "PR", ibgeCode: "4106902" },
  { name: "Castro", uf: "PR", ibgeCode: "4104907" },
  { name: "Carambeí", uf: "PR", ibgeCode: "4104659" },
  { name: "Palmeira", uf: "PR", ibgeCode: "4117701" },
  { name: "São Paulo", uf: "SP", ibgeCode: "3550308" },
  { name: "Santos", uf: "SP", ibgeCode: "3548500" },
];

export function EducationJourneyPreview() {
  const [session, setSession] = useState(0);
  const [saveFails, setSaveFails] = useState(false);
  const [result, setResult] = useState<EducationJourneyValue | null>(null);

  async function complete(value: EducationJourneyValue) {
    if (saveFails) throw new Error("Falha simulada");
    setResult(value);
  }

  function reset() {
    setResult(null);
    setSession((current) => current + 1);
  }

  return (
    <main className={styles.page}>
      <nav className={styles.prototypeTools} aria-label="Cenários do preview">
        <span>Tela</span>
        <button type="button" aria-pressed={!saveFails} onClick={() => setSaveFails(false)}>Fluxo normal</button>
        <button type="button" aria-pressed={saveFails} onClick={() => setSaveFails(true)}>Falha ao salvar</button>
        <button type="button" onClick={reset}>Reiniciar</button>
      </nav>

      <header className={styles.brandHeader}>
        <div><span className={styles.brandMark}>V<span>▴</span></span><i /> <strong>Promotor</strong></div>
      </header>

      <div className={styles.canvas}>
        <EducationJourney key={session} cities={CITIES} typingSpeedMs={18} processingDelayMs={700} onBack={() => undefined} onComplete={complete} />
      </div>

      <footer className={styles.footer}>V7M · CNPJ 48.811.016/0001-00 <i /> Termos <i /> Privacidade <i /> Dados tratados conforme a LGPD</footer>

      {result && <details className={styles.result}><summary>Ver dados estruturados</summary><pre aria-label="Resultado estruturado">{JSON.stringify(result, null, 2)}</pre></details>}
    </main>
  );
}
