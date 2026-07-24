"use client";

import {
  ArrowLeft,
  Camera,
  Check,
  FileText,
  FileUp,
  RefreshCw,
  RotateCcw,
  Send,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import styles from "./addressProofExperience.module.css";

export type AddressProofMethod = "camera" | "file";

export type AddressProofSubmission = {
  file: File;
  method: AddressProofMethod;
  signal: AbortSignal;
};

type Phase = "choice" | "camera" | "file" | "preview" | "submitting" | "error" | "success";

type Props = {
  onSubmit: (submission: AddressProofSubmission) => Promise<void>;
  onBack?: () => void;
  onComplete?: () => void;
  initialError?: string | null;
  maxBytes?: number;
  successDurationMs?: number;
};

const defaultMaxBytes = 10 * 1024 * 1024;
const acceptedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

function isImage(file: File) {
  return file.type.startsWith("image/");
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AddressIllustration() {
  return (
    <svg className={styles.addressIllustration} data-testid="address-proof-illustration" viewBox="0 0 160 110" fill="none" aria-hidden>
      <defs>
        <linearGradient id="address-proof-gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f4dca0" />
          <stop offset="0.5" stopColor="#d9b15a" />
          <stop offset="1" stopColor="#b07f30" />
        </linearGradient>
      </defs>
      <path d="M14 50 54 20 94 50" stroke="url(#address-proof-gold)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 46v36a4 4 0 0 0 4 4h56a4 4 0 0 0 4-4V46" stroke="rgba(200,204,210,.75)" strokeWidth="2.5" strokeLinecap="round" fill="rgba(29,29,32,.75)" />
      <rect x="44" y="58" width="20" height="28" rx="2.5" fill="rgba(217,177,90,.18)" stroke="rgba(217,177,90,.6)" strokeWidth="1.6" />
      <circle cx="60" cy="72" r="1.6" fill="rgba(240,212,147,.85)" />
      <rect x="96" y="34" width="48" height="62" rx="6" fill="#1d1d20" stroke="#d9b15a" strokeWidth="1.8" />
      <rect x="96" y="34" width="48" height="5" rx="2.5" fill="url(#address-proof-gold)" />
      <rect x="104" y="48" width="32" height="3.5" rx="1.75" fill="rgba(240,212,147,.6)" />
      <rect x="104" y="57" width="24" height="3.5" rx="1.75" fill="rgba(230,232,236,.3)" />
      <rect x="104" y="66" width="28" height="3.5" rx="1.75" fill="rgba(230,232,236,.3)" />
      <rect x="104" y="75" width="20" height="3.5" rx="1.75" fill="rgba(230,232,236,.3)" />
      <circle cx="132" cy="85" r="7" stroke="rgba(121,211,155,.8)" strokeWidth="1.6" />
      <path d="m129 85 2.2 2.2 4-4.4" stroke="rgba(121,211,155,.9)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

async function validateFile(file: File, maxBytes: number) {
  if (!acceptedTypes.has(file.type)) {
    throw new Error("Formato não aceito. Envie uma imagem JPG, PNG, WEBP, HEIC ou um PDF.");
  }
  if (file.size === 0) {
    throw new Error("O arquivo está vazio. Escolha outro comprovante.");
  }
  if (file.size > maxBytes) {
    throw new Error(`O arquivo ultrapassa ${Math.round(maxBytes / (1024 * 1024))} MB. Reduza o tamanho ou escolha outro.`);
  }
  if (isImage(file)) {
    try {
      const bitmap = await createImageBitmap(file);
      const tooSmall = bitmap.width < 320 || bitmap.height < 240;
      bitmap.close();
      if (tooSmall) {
        throw new Error("A imagem está pequena demais para leitura. Tire outra foto mostrando o comprovante inteiro.");
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("pequena demais")) throw error;
      throw new Error("Não conseguimos ler esta imagem. Tire outra foto ou envie um PDF.");
    }
  }
}

export function AddressProofExperience({
  onSubmit,
  onBack,
  onComplete,
  initialError = null,
  maxBytes = defaultMaxBytes,
  successDurationMs = 900,
}: Props) {
  const [phase, setPhase] = useState<Phase>(initialError ? "error" : "choice");
  const [method, setMethod] = useState<AddressProofMethod | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialError);
  const [canRetrySubmission, setCanRetrySubmission] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attemptRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function replacePreview(nextFile: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(nextFile && isImage(nextFile) ? URL.createObjectURL(nextFile) : null);
  }

  function cancelPending() {
    attemptRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
  }

  function reset(nextPhase: Phase = "choice") {
    cancelPending();
    replacePreview(null);
    setFile(null);
    setMethod(null);
    setError(null);
    setCanRetrySubmission(false);
    setPhase(nextPhase);
  }

  function chooseMethod(nextMethod: AddressProofMethod) {
    cancelPending();
    replacePreview(null);
    setFile(null);
    setError(null);
    setCanRetrySubmission(false);
    setMethod(nextMethod);
    setPhase(nextMethod);
  }

  async function prepareFile(nextFile: File, nextMethod: AddressProofMethod) {
    const attempt = attemptRef.current + 1;
    attemptRef.current = attempt;
    setMethod(nextMethod);
    setFile(nextFile);
    replacePreview(nextFile);
    setError(null);
    setCanRetrySubmission(false);
    setPhase("submitting");

    try {
      await validateFile(nextFile, maxBytes);
      if (attempt !== attemptRef.current) return;
      if (nextMethod === "camera") {
        setPhase("preview");
        return;
      }
      await submitFile(nextFile, nextMethod, attempt);
    } catch (validationError) {
      if (attempt !== attemptRef.current) return;
      setError(validationError instanceof Error ? validationError.message : "Não conseguimos validar o comprovante.");
      setCanRetrySubmission(false);
      setPhase("error");
    }
  }

  async function submitFile(nextFile = file, nextMethod = method, attempt = attemptRef.current + 1) {
    if (!nextFile || !nextMethod) return;
    attemptRef.current = attempt;
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    setError(null);
    setCanRetrySubmission(false);
    setPhase("submitting");

    try {
      await onSubmit({ file: nextFile, method: nextMethod, signal: controller.signal });
      if (attempt !== attemptRef.current || controller.signal.aborted) return;
      setPhase("success");
      window.setTimeout(() => {
        if (attempt === attemptRef.current) onComplete?.();
      }, successDurationMs);
    } catch (submissionError) {
      if (controller.signal.aborted || attempt !== attemptRef.current) return;
      setError(
        submissionError instanceof Error && submissionError.message
          ? submissionError.message
          : "A conexão oscilou. Tente novamente — seu cadastro continua salvo.",
      );
      setCanRetrySubmission(true);
      setPhase("error");
    }
  }

  function handleInput(input: HTMLInputElement | null, nextMethod: AddressProofMethod) {
    const selectedFile = input?.files?.[0];
    if (selectedFile) void prepareFile(selectedFile, nextMethod);
    if (input) input.value = "";
  }

  function goBack() {
    if (phase === "choice") {
      onBack?.();
      return;
    }
    reset();
  }

  const methodLabel = method === "camera" ? "foto" : "arquivo";

  const methodButtons = (
    <div className={styles.methods}>
      <button type="button" aria-pressed={method === "camera"} onClick={() => chooseMethod("camera")}>
        <Camera aria-hidden />
        <strong>Tirar foto</strong>
      </button>
      <button type="button" aria-pressed={method === "file"} onClick={() => chooseMethod("file")}>
        <FileUp aria-hidden />
        <strong>Enviar arquivo</strong>
      </button>
    </div>
  );

  return (
    <section className={styles.experience} data-phase={phase} data-testid="address-proof-experience">
      <div className={styles.card} data-testid="address-proof-card">
        <div className={styles.rails} aria-hidden><span /><span /><span /></div>
        <div className={styles.divider} aria-hidden />
        <div className={styles.enter}>
          <header className={styles.header}>
          <p className={styles.kicker}>Comprovante</p>
          <h1>Comprovante de residência</h1>
          <p className={styles.subtitle}>
            {phase === "choice" && "Como você prefere enviar?"}
            {phase === "camera" && "Uma foto legível da conta resolve."}
            {phase === "file" && "Imagem ou PDF — como preferir."}
            {phase === "preview" && "Confira a foto antes de enviar."}
            {phase === "submitting" && (file ? `Validando e enviando ${methodLabel}…` : "Preparando envio…")}
            {phase === "error" && "Nada foi perdido. Corrija e tente novamente."}
            {phase === "success" && "Recebemos o comprovante."}
          </p>
          </header>

          <input
            ref={cameraInputRef}
            className={styles.hiddenInput}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={() => handleInput(cameraInputRef.current, "camera")}
          />
          <input
            ref={fileInputRef}
            className={styles.hiddenInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
            onChange={() => handleInput(fileInputRef.current, "file")}
          />

          <div className={styles.stage} aria-live="polite">
            {phase === "choice" && (
              <div className={styles.choice}>
                <AddressIllustration />
                {methodButtons}
                <p className={styles.guidance}>Conta de luz, água ou internet dos últimos 3 meses. O endereço sai do documento — sem digitar CEP.</p>
              </div>
            )}

            {phase === "camera" && (
              <div className={styles.pop}>
                <div className={styles.cameraFrame}>
                  <div className={styles.documentGuide}><span>Encaixe o comprovante inteiro</span></div>
                </div>
                <button type="button" className={styles.shutter} onClick={() => cameraInputRef.current?.click()} aria-label="Abrir câmera para tirar foto" />
              </div>
            )}

            {phase === "file" && (
              <div className={`${styles.fileChoice} ${styles.pop}`}>
                {methodButtons}
                <button type="button" className={styles.dropzone} onClick={() => fileInputRef.current?.click()}>
                  <FileUp aria-hidden />
                  <strong>Toque para anexar (imagem ou PDF)</strong>
                  <span>Imagem ou PDF · até {Math.round(maxBytes / (1024 * 1024))} MB</span>
                </button>
              </div>
            )}

            {phase === "preview" && file && (
              <div className={styles.pop}>
                <div className={styles.preview}>
                  {previewUrl ? <Image src={previewUrl} alt="Prévia do comprovante" width={960} height={600} unoptimized /> : <FileText aria-hidden />}
                </div>
                <div className={styles.fileMeta}><strong>Ficou boa?</strong><span>{file.name} · {formatFileSize(file.size)}</span></div>
                <div className={styles.previewActions}>
                  <button type="button" className={styles.secondaryButton} onClick={() => cameraInputRef.current?.click()}><RotateCcw aria-hidden /> Tirar outra</button>
                  <button type="button" className={styles.primaryButton} onClick={() => void submitFile()}><Send aria-hidden /> Enviar</button>
                </div>
              </div>
            )}

            {phase === "submitting" && (
              <div className={`${styles.statusPanel} ${styles.enter}`} role="status">
                <RefreshCw className={styles.spinner} aria-hidden />
                <strong>{file ? `Validando e enviando ${methodLabel}…` : "Preparando…"}</strong>
              </div>
            )}

            {phase === "error" && (
              <div className={`${styles.errorPanel} ${styles.pop}`} role="alert">
                <X aria-hidden />
                <div><strong>Não deu certo desta vez</strong><p>{error}</p></div>
                <div className={styles.errorActions}>
                  {file && canRetrySubmission && <button type="button" className={styles.primaryButton} onClick={() => void submitFile()}><RefreshCw aria-hidden /> Tentar novamente</button>}
                  <button type="button" className={styles.secondaryButton} onClick={() => chooseMethod(method ?? "file")}>Escolher outro</button>
                </div>
              </div>
            )}

            {phase === "success" && (
              <div className={`${styles.successPanel} ${styles.pop}`} role="status">
                <span><Check aria-hidden /></span>
                <strong>Comprovante recebido</strong>
                <p>A análise do endereço continua em segundo plano. Você já pode seguir.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <button type="button" className={styles.back} onClick={goBack} aria-label={phase === "choice" ? "Voltar" : "Trocar método"}>
        <ArrowLeft aria-hidden /> {phase === "choice" ? "Voltar" : "Trocar método"}
      </button>
    </section>
  );
}
