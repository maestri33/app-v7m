"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  FileText,
  RefreshCcw,
  Send,
  X,
} from "lucide-react";

import styles from "./documentCapture.module.css";

export type DocumentKind = "rg" | "cnh";
export type DocumentMethod = "photo" | "file";
export type DocumentSide = "front" | "back" | "full";

export type DocumentSubmission = {
  kind: DocumentKind;
  method: DocumentMethod;
  side: DocumentSide;
  file?: File;
};

export type DocumentSubmitResult =
  | { status: "success" }
  | { status: "error"; message: string };

type Dialog = "rg-file" | "rg-front" | "rg-back" | "cnh-photo" | "cnh-file";
type Phase = "choose" | "method" | "camera" | "review" | "file" | "processing" | "complete";

export type DocumentCaptureProps = {
  onSubmit?: (submission: DocumentSubmission) => Promise<DocumentSubmitResult>;
  onComplete?: (kind: DocumentKind) => void;
  onBack?: () => void;
  demoPdf?: boolean;
  initialKind?: DocumentKind | null;
  initialRgFrontSent?: boolean;
};

const MAX_PDF_BYTES = 10 * 1024 * 1024;

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

const dialogCopy: Record<Dialog, { title: string; body: string; action: string }> = {
  "rg-file": {
    title: "RG é só por foto",
    body: "Arquivo digital vale apenas para a CNH (em PDF). Para o RG, tire uma foto da frente e outra do verso.",
    action: "Tirar foto",
  },
  "rg-front": {
    title: "Primeiro, a FRENTE do RG",
    body: "Documento fechado, lado da foto. Tire a foto da frente inteira, sem cortar as bordas.",
    action: "OK, abrir câmera",
  },
  "rg-back": {
    title: "Agora, o VERSO do RG",
    body: "Frente enviada ✓ Vire o documento e fotografe o verso por inteiro.",
    action: "OK, abrir câmera",
  },
  "cnh-photo": {
    title: "Foto da CNH aberta",
    body: "A foto precisa ser tirada do documento ABERTO — frente e verso visíveis, sem cortar as bordas.",
    action: "OK, abrir câmera",
  },
  "cnh-file": {
    title: "PDF oficial da CNH Digital",
    body: "Só será aceito o arquivo emitido pelo app CNH Digital (gov.br). A gente valida o formato PDF e o tamanho na hora do envio.",
    action: "OK, anexar PDF",
  },
};

function DocumentArtwork({ kind, back = false }: { kind: DocumentKind; back?: boolean }) {
  if (back) {
    return (
      <svg className={styles.documentArtwork} viewBox="0 0 120 76" fill="none" aria-hidden>
        <rect x="2" y="2" width="116" height="72" rx="9" fill="#1d1d20" stroke="#c8ccd2" strokeWidth="1.6" />
        <rect x="10" y="14" width="100" height="4" rx="2" fill="rgba(230,232,236,.5)" />
        <rect x="10" y="26" width="78" height="4" rx="2" fill="rgba(230,232,236,.25)" />
        <rect x="10" y="38" width="88" height="4" rx="2" fill="rgba(230,232,236,.25)" />
        <rect x="76" y="50" width="34" height="16" rx="4" fill="rgba(200,204,210,.1)" stroke="rgba(200,204,210,.4)" />
      </svg>
    );
  }

  const accent = kind === "cnh" ? "#d9b15a" : "#c8ccd2";
  const soft = kind === "cnh" ? "rgba(240,212,147,.75)" : "rgba(230,232,236,.7)";
  return (
    <svg className={styles.documentArtwork} viewBox="0 0 120 76" fill="none" aria-hidden>
      <rect x="2" y="2" width="116" height="72" rx="9" fill="#1d1d20" stroke={accent} strokeWidth="1.6" />
      <rect x="2" y="2" width="116" height="5" rx="2.5" fill={accent} />
      <rect x="10" y="16" width="26" height="32" rx="4" fill={`${accent}1f`} stroke={`${accent}80`} />
      <circle cx="23" cy="27" r="5.5" stroke={soft} strokeWidth="1.4" />
      <path d="M15 44c1.6-4.5 4.6-6.8 8-6.8s6.4 2.3 8 6.8" stroke={soft} strokeWidth="1.4" strokeLinecap="round" />
      <rect x="44" y="18" width="60" height="4" rx="2" fill={soft} opacity=".72" />
      <rect x="44" y="28" width="46" height="4" rx="2" fill={soft} opacity=".38" />
      <rect x="44" y="38" width="52" height="4" rx="2" fill={soft} opacity=".38" />
      <rect x="10" y="58" width={kind === "cnh" ? "60" : "94"} height="4" rx="2" fill={accent} opacity=".28" />
      {kind === "cnh" && (
        <>
          <circle cx="94" cy="56" r="11" stroke={soft} strokeWidth="1.6" />
          <circle cx="94" cy="56" r="3" fill={soft} />
          <path d="M94 45v8M84.5 61.5l6.8-3.9M103.5 61.5l-6.8-3.9" stroke={soft} strokeWidth="1.6" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export function DocumentCapture({
  onSubmit,
  onComplete,
  onBack,
  demoPdf = false,
  initialKind = null,
  initialRgFrontSent = false,
}: DocumentCaptureProps) {
  const titleId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<DocumentKind | null>(initialKind);
  const [phase, setPhase] = useState<Phase>(initialKind ? "method" : "choose");
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [side, setSide] = useState<DocumentSide>(
    initialKind === "cnh" ? "full" : initialRgFrontSent ? "back" : "front",
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!dialog) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setDialog(null);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [dialog]);

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  function setPhoto(file: File | null) {
    setPhotoFile(file);
    setPhotoUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  function reset() {
    setKind(null);
    setPhase("choose");
    setDialog(null);
    setSide("front");
    setPhoto(null);
    setError(null);
    setStatus(null);
  }

  function selectKind(nextKind: DocumentKind) {
    setKind(nextKind);
    setSide(nextKind === "rg" ? "front" : "full");
    setPhase("method");
    setError(null);
  }

  function choosePhoto() {
    if (!kind) return;
    setError(null);
    setDialog(kind === "rg" ? "rg-front" : "cnh-photo");
  }

  function chooseFile() {
    if (!kind) return;
    setError(null);
    setDialog(kind === "rg" ? "rg-file" : "cnh-file");
  }

  function confirmDialog() {
    if (!dialog) return;
    if (dialog === "rg-file") {
      setDialog("rg-front");
      return;
    }
    if (dialog === "cnh-file") {
      setDialog(null);
      setPhase("file");
      return;
    }
    setDialog(null);
    setPhase("camera");
  }

  function capturePhoto() {
    cameraRef.current?.click();
  }

  function reviewPhoto(file: File) {
    setPhoto(file);
    setFlash(true);
    setError(null);
    window.setTimeout(() => {
      setFlash(false);
      setPhase("review");
    }, 170);
  }

  async function submit(submission: DocumentSubmission) {
    if (!kind) return;
    const previousPhase = submission.method === "file" ? "file" : "review";
    setError(null);
    setStatus(submission.method === "file" ? "Validando o PDF…" : "Enviando sua foto…");
    setPhase("processing");

    const result = onSubmit
      ? await onSubmit(submission).catch(() => ({
          status: "error" as const,
          message: "A conexão oscilou. Tente novamente sem recomeçar.",
        }))
      : (await wait(900), { status: "success" as const });

    if (result.status === "error") {
      setStatus(null);
      setError(result.message);
      setPhase(previousPhase);
      return;
    }

    if (kind === "rg" && submission.side === "front") {
      setStatus("Frente recebida.");
      setSide("back");
      setPhoto(null);
      setPhase("method");
      setDialog("rg-back");
      return;
    }

    setStatus("Documento recebido.");
    setPhase("complete");
    onComplete?.(kind);
  }

  function validatePdf(file: File) {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Esse arquivo não é um PDF. Escolha a CNH Digital emitida pelo gov.br.");
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setError("O PDF ultrapassa 10 MB. Baixe novamente pelo app CNH Digital.");
      return;
    }
    void submit({ kind: "cnh", method: "file", side: "full", file });
  }

  function useDemoPdf() {
    validatePdf(new File(["PDF de demonstração"], "cnh-digital-demo.pdf", { type: "application/pdf" }));
  }

  const cameraHint = kind === "cnh"
    ? "Encaixe a CNH aberta aqui"
    : side === "front"
      ? "Encaixe a frente do RG"
      : "Agora encaixe o verso do RG";

  return (
    <section className={styles.shell} aria-labelledby={titleId}>
      <div className={styles.progress} aria-label="Etapa Documento">
        <span />
        <span />
        <span />
      </div>

      <div className={styles.rule} />

      <header className={styles.heading}>
        <p>Identificação</p>
        <h1 id={titleId}>Documento com foto</h1>
        <span>
          {phase === "choose" && "Escolha o documento que você vai usar."}
          {phase === "method" && kind === "rg" && "RG é enviado por foto — frente e verso."}
          {phase === "method" && kind === "cnh" && "Como você prefere enviar sua CNH?"}
          {(phase === "camera" || phase === "review") && kind === "rg" && "Frente e verso, bem iluminados e sem cortar as bordas."}
          {(phase === "camera" || phase === "review") && kind === "cnh" && "Foto da CNH aberta, com frente e verso visíveis."}
          {phase === "file" && "Somente o PDF oficial da CNH Digital."}
          {phase === "processing" && status}
          {phase === "complete" && "Tudo certo. Você pode seguir para a próxima etapa."}
        </span>
      </header>

      <div className={styles.stage}>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className={styles.hiddenInput}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) reviewPhoto(file);
            event.target.value = "";
          }}
        />

        {phase === "choose" && (
          <div className={styles.choiceGrid} data-phase="choose">
            <button type="button" className={styles.documentCard} onClick={() => selectKind("rg")}>
              <DocumentArtwork kind="rg" />
              <strong>RG</strong>
              <span>Registro Geral<br />(frente e verso)</span>
            </button>
            <button type="button" className={styles.documentCard} onClick={() => selectKind("cnh")}>
              <DocumentArtwork kind="cnh" />
              <strong>CNH</strong>
              <span>Carteira de<br />Habilitação</span>
            </button>
          </div>
        )}

        {phase === "method" && kind && (
          <div className={styles.methodPanel} data-phase="method">
            <div className={styles.selectedArtwork}><DocumentArtwork kind={kind} back={kind === "rg" && side === "back"} /></div>
            <div className={styles.selectedDocument}>
              <strong>{kind === "rg" ? "RG — Registro Geral" : "CNH — Carteira de Habilitação"}</strong>
              <button type="button" onClick={reset}>Trocar documento</button>
            </div>
            <div className={styles.methodGrid}>
              <button type="button" onClick={choosePhoto}>
                <Camera aria-hidden />
                <strong>Tirar foto</strong>
              </button>
              <button type="button" onClick={chooseFile}>
                <FileText aria-hidden />
                <strong>Enviar arquivo</strong>
              </button>
            </div>
            <p className={styles.methodHint}>{kind === "rg" ? "RG aceita somente foto (frente e verso)" : "Arquivo digital: somente PDF · Foto: CNH aberta"}</p>
          </div>
        )}

        {phase === "camera" && (
          <div className={styles.cameraStage} data-phase="camera">
            <div className={styles.viewfinder}>
              <div className={kind === "cnh" ? styles.cnhGuide : styles.rgGuide} aria-hidden>
                <span>{cameraHint}</span>
              </div>
              {flash && <div className={styles.flash} aria-hidden />}
            </div>
            <button type="button" className={styles.shutter} onClick={capturePhoto} aria-label="Tirar foto">
              <span />
            </button>
          </div>
        )}

        {phase === "review" && kind && (
          <div className={styles.review} data-phase="review">
            <div className={styles.photoPreview} aria-label={`Prévia de ${cameraHint.toLowerCase()}`}>
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="" />
              ) : (
                <div className={styles.previewDocument}><DocumentArtwork kind={kind} back={side === "back"} /></div>
              )}
            </div>
            <h2>Ficou boa?</h2>
            <div className={styles.reviewActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => {
                setPhoto(null);
                setPhase("camera");
              }}>
                <RefreshCcw aria-hidden /> Tirar outra
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => {
                  if (!photoFile) {
                    setError("Tire a foto novamente para continuar.");
                    setPhase("camera");
                    return;
                  }
                  void submit({ kind, method: "photo", side, file: photoFile });
                }}
              >
                <Send aria-hidden /> Enviar
              </button>
            </div>
          </div>
        )}

        {phase === "file" && (
          <div className={styles.filePanel} data-phase="file">
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) validatePdf(file);
                event.target.value = "";
              }}
            />
            <button type="button" className={styles.fileDrop} onClick={() => fileRef.current?.click()}>
              <FileText aria-hidden />
              <strong>Toque para anexar o PDF</strong>
              <span>CNH Digital do gov.br · até 10 MB</span>
            </button>
            {demoPdf && <button type="button" className={styles.demoButton} onClick={useDemoPdf}>Usar PDF de demonstração</button>}
          </div>
        )}

        {phase === "processing" && (
          <div className={styles.processing} role="status" aria-live="polite" data-phase="processing">
            <span className={styles.spinner} aria-hidden />
            <strong>{status}</strong>
          </div>
        )}

        {phase === "complete" && (
          <div className={styles.complete} role="status" data-phase="complete">
            <span><Check aria-hidden /></span>
            <h2>Documento recebido</h2>
            <p>A análise detalhada continua em segundo plano.</p>
            <button type="button" className={styles.primaryButton} onClick={reset}>Testar outro fluxo</button>
          </div>
        )}
      </div>

      {error && (
        <div className={styles.error} role="alert">
          <X aria-hidden />
          <span><strong>Não deu certo desta vez.</strong>{error}</span>
        </div>
      )}

      {onBack && phase !== "processing" && phase !== "complete" && (
        <button type="button" className={styles.backButton} onClick={onBack}><ArrowLeft aria-hidden /> Voltar</button>
      )}

      {dialog && (
        <div className={styles.dialogBackdrop} onMouseDown={(event) => {
          if (event.currentTarget === event.target) setDialog(null);
        }}>
          <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby={`${titleId}-dialog`}>
            <button type="button" className={styles.dialogClose} onClick={() => setDialog(null)} aria-label="Fechar"><X aria-hidden /></button>
            <span className={styles.dialogIcon}>{dialog.includes("file") ? <FileText aria-hidden /> : <Camera aria-hidden />}</span>
            <h2 id={`${titleId}-dialog`}>{dialogCopy[dialog].title}</h2>
            <p>{dialogCopy[dialog].body}</p>
            <button type="button" className={styles.primaryButton} onClick={confirmDialog}>{dialogCopy[dialog].action}</button>
          </div>
        </div>
      )}
    </section>
  );
}
