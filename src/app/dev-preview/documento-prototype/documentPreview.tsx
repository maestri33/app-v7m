"use client";

import { useRef, useState } from "react";

import {
  DocumentCapture,
  type DocumentSubmission,
  type DocumentSubmitResult,
} from "@/components/documentCapture";

import styles from "./preview.module.css";

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export function DocumentPreview() {
  const attempts = useRef(new Map<string, number>());
  const [event, setEvent] = useState("Escolha RG ou CNH");

  async function submit(submission: DocumentSubmission): Promise<DocumentSubmitResult> {
    const key = `${submission.kind}-${submission.method}-${submission.side}`;
    const attempt = (attempts.current.get(key) ?? 0) + 1;
    attempts.current.set(key, attempt);
    setEvent(`Enviando ${key} · tentativa ${attempt}`);
    await wait(submission.method === "file" ? 1200 : 900);

    if (attempt === 1) {
      setEvent(`Falha recuperável em ${key}`);
      return {
        status: "error",
        message: submission.method === "file"
          ? "Não conseguimos validar o PDF agora. Tente anexá-lo novamente."
          : "A foto ficou com pouco foco. Tire outra ou envie novamente.",
      };
    }

    setEvent(`${key} recebido`);
    return { status: "success" };
  }

  return (
    <main className={styles.screen}>
      <header className={styles.brand}>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="V7M" />
          <b>·</b>
          <strong>Promotor</strong>
        </div>
        <span>Olá, <strong>Maria</strong></span>
      </header>
      <div className={styles.brandRule} />
      <div className={styles.layout}>
        <p className={styles.srOnly} role="status">Estado: {event}</p>
        <DocumentCapture
          demoPdf
          onSubmit={submit}
          onComplete={(kind) => setEvent(`${kind.toUpperCase()} concluído`)}
          onBack={() => setEvent("Voltar acionado")}
        />
      </div>
      <footer className={styles.footer}>
        <div />
        <p><strong>V7M</strong> · CNPJ 48.811.016/0001-00 <span>·</span> WhatsApp (11) 92006-2177 <span>·</span> Termos&nbsp;&nbsp; Privacidade <span>·</span> Dados tratados conforme a LGPD</p>
      </footer>
    </main>
  );
}
