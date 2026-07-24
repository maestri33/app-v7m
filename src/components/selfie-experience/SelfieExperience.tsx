"use client";

import {
  AlertTriangle,
  Camera,
  Check,
  Clock3,
  RefreshCw,
  WifiOff,
} from "lucide-react";
import Image from "next/image";
import {
  ChangeEvent,
  UIEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import styles from "./SelfieExperience.module.css";

export type SelfieExperienceState =
  | "agreement"
  | "requesting-camera"
  | "camera"
  | "preview"
  | "analyzing"
  | "approved"
  | "rejected"
  | "manual-review"
  | "camera-error"
  | "network-error";

export type SelfieAnalysisResult =
  | "analyzing"
  | "approved"
  | "rejected"
  | "manual-review"
  | "network-error";

type CameraBehavior = "live" | "simulated" | "permission-denied" | "unavailable";

export type SelfieExperienceProps = {
  initialState?: SelfieExperienceState;
  cameraBehavior?: CameraBehavior;
  demoOutcome?: SelfieAnalysisResult;
  analysisDelayMs?: number;
  onAnalyze?: (photo: Blob | null) => Promise<SelfieAnalysisResult>;
  onComplete?: () => void;
  onBack?: () => void;
  agreementText?: string;
  agreementVersion?: string;
  rejectionReason?: string | null;
  networkErrorMessage?: string | null;
  hubWhatsapp?: string | null;
};

const AGREEMENT_SECTIONS = [
  ["Sua parceria com a V7M", "Pelo presente instrumento, o(a) PROMOTOR(A) atua como afiliado(a) comercial independente na captação de alunos, recebendo comissão por matrícula paga."],
  ["Comissões e pagamentos", "As comissões são apuradas semanalmente e pagas via Pix na chave cadastrada, sempre no fechamento de sexta-feira."],
  ["Veracidade e uso de imagem", "O(A) PROMOTOR(A) declara que as informações prestadas são verdadeiras e autoriza o uso da imagem e biometria exclusivamente para identificação."],
  ["Confirmação de identidade", "A selfie coletada na próxima etapa confirma a identidade do(a) contratante, com registro de data, hora e dispositivo."],
  ["Proteção dos seus dados (LGPD)", "Este acordo observa a Lei Geral de Proteção de Dados. Seus dados são tratados apenas para os fins da parceria."],
] as const;

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function stateTitle(state: SelfieExperienceState) {
  if (state === "agreement") return "Selfie de segurança";
  if (state === "requesting-camera") return "Abrindo sua câmera";
  if (state === "camera") return "Enquadre seu rosto";
  if (state === "preview") return "Ficou boa?";
  if (state === "analyzing") return "Analisando sua selfie";
  if (state === "approved") return "Identidade confirmada";
  if (state === "rejected") return "Precisamos de outra foto";
  if (state === "manual-review") return "Foto recebida para análise";
  if (state === "network-error") return "A selfie não foi enviada";
  return "Não conseguimos abrir a câmera";
}

export function SelfieExperience({
  initialState = "agreement",
  cameraBehavior = "live",
  demoOutcome = "approved",
  analysisDelayMs = 1800,
  onAnalyze,
  onComplete,
  onBack,
  agreementText,
  agreementVersion,
  rejectionReason,
  networkErrorMessage,
  hubWhatsapp,
}: SelfieExperienceProps) {
  const [state, setState] = useState<SelfieExperienceState>(initialState);
  const [agreementRead, setAgreementRead] = useState(initialState !== "agreement");
  const [flash, setFlash] = useState(false);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraRequestRef = useRef(0);
  const panelRef = useRef<HTMLElement>(null);
  const agreementRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const agreementBlocks = agreementText
    ? agreementText.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean)
    : null;

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function clearPhoto() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPhoto(null);
  }

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
  }, [state]);

  useEffect(() => {
    if (state !== "agreement") return;
    const frame = window.requestAnimationFrame(() => {
      const element = agreementRef.current;
      if (element && element.scrollHeight - element.clientHeight <= 24) {
        setAgreementRead(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [agreementBlocks, agreementText, state]);

  useEffect(
    () => () => {
      stopCamera();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  useEffect(() => {
    if (state !== "camera" || !videoRef.current || !streamRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    void videoRef.current.play();
  }, [state]);

  async function openCamera() {
    const requestId = cameraRequestRef.current + 1;
    cameraRequestRef.current = requestId;
    clearPhoto();
    setState("requesting-camera");
    await wait(320);
    if (requestId !== cameraRequestRef.current) return;

    if (cameraBehavior === "permission-denied" || cameraBehavior === "unavailable") {
      setState("camera-error");
      return;
    }
    if (cameraBehavior === "simulated") {
      setState("camera");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setState("camera-error");
      return;
    }

    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
      });
      if (requestId !== cameraRequestRef.current) {
        stopCamera();
        return;
      }
      setState("camera");
    } catch {
      setState("camera-error");
    }
  }

  async function capture() {
    if (cameraBehavior === "live") {
      const video = videoRef.current;
      if (!video?.videoWidth || !video.videoHeight) return;
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 1280 / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const context = canvas.getContext("2d");
      if (!context) return;
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9),
      );
      if (!blob) return;
      setPhoto(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      stopCamera();
    }

    setFlash(true);
    window.setTimeout(() => {
      setFlash(false);
      setState("preview");
    }, 170);
  }

  function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const selectedPhoto = event.target.files?.[0];
    if (!selectedPhoto) return;
    cameraRequestRef.current += 1;
    stopCamera();
    clearPhoto();
    setPhoto(selectedPhoto);
    setPreviewUrl(URL.createObjectURL(selectedPhoto));
    setState("preview");
    event.target.value = "";
  }

  async function analyzePhoto() {
    setState("analyzing");
    try {
      const result = onAnalyze
        ? await onAnalyze(photo)
        : await wait(analysisDelayMs).then(() => demoOutcome);
      setState(result);
    } catch {
      setState("network-error");
    }
  }

  function retryCamera() {
    stopCamera();
    clearPhoto();
    void openCamera();
  }

  function agreementScrolled(event: UIEvent<HTMLDivElement>) {
    const element = event.currentTarget;
    const distanceFromEnd = element.scrollHeight - element.scrollTop - element.clientHeight;
    if (distanceFromEnd <= 24) setAgreementRead(true);
  }

  const isPermissionDenied = cameraBehavior === "permission-denied";

  return (
    <section
      ref={panelRef}
      className={styles.shell}
      aria-labelledby={titleId}
      tabIndex={-1}
    >
      {state === "agreement" && <SelfieHero />}

      <div className={styles.stage} data-state={state}>
        {flash && <span className={styles.flash} aria-hidden />}

        <div className={styles.progress} aria-hidden>
          <span />
          <span />
          <span />
        </div>

        <header className={styles.heading}>
          <p className={styles.kicker}>Confirmação</p>
          <h1 id={titleId}>Selfie de segurança</h1>
          <p>Só pra confirmar que é você mesmo — igual fizemos com seu documento.</p>
        </header>

        {state === "agreement" && (
          <div className={styles.step}>
            <p className={styles.instruction}>Antes de tirar a selfie, leia e aceite o acordo de parceria.</p>
            <div ref={agreementRef} className={styles.agreement} onScroll={agreementScrolled} tabIndex={0}>
              {agreementBlocks
                ? agreementBlocks.map((copy, index) => (
                    <section key={`${index}-${copy.slice(0, 24)}`}>
                      {index === 0 ? <h2>{copy}</h2> : <p>{copy}</p>}
                    </section>
                  ))
                : AGREEMENT_SECTIONS.map(([title, copy]) => (
                    <section key={title}>
                      <h2>{title}</h2>
                      <p>{copy}</p>
                    </section>
                  ))}
              {agreementVersion && <p>Versão do acordo: {agreementVersion}</p>}
              <p className={styles.endMarker}>Fim do acordo</p>
            </div>
            <button
              className={styles.primaryButton}
              type="button"
              disabled={!agreementRead}
              onClick={() => void openCamera()}
            >
              {agreementRead ? "Li e aceito o acordo" : "Role até o fim para aceitar"}
            </button>
          </div>
        )}

        {state === "requesting-camera" && (
          <StatusPanel icon={<Camera />} title="Solicitando acesso" copy="Se o navegador perguntar, escolha Permitir." busy />
        )}

        {state === "camera" && (
          <div className={`${styles.step} ${styles.pop}`}>
            <div className={styles.cameraViewport}>
              {cameraBehavior === "live" ? (
                <video ref={videoRef} muted playsInline autoPlay aria-label="Prévia da câmera frontal" />
              ) : null}
              <div className={styles.faceGuide} aria-hidden><span /></div>
              <p>Centralize o seu rosto</p>
            </div>
            <button className={styles.shutter} type="button" onClick={() => void capture()} aria-label="Tirar selfie">
              <span />
            </button>
          </div>
        )}

        {state === "preview" && (
          <div className={`${styles.step} ${styles.pop}`}>
            <div className={styles.preview}>
              {previewUrl ? (
                <Image
                  src={previewUrl}
                  alt="Selfie capturada"
                  width={1280}
                  height={960}
                  unoptimized
                />
              ) : (
                <FaceIllustration />
              )}
            </div>
            <p className={styles.previewQuestion}>Ficou boa?</p>
            <p className={styles.hint}>Rosto inteiro, boa luz e sem objetos cobrindo seus olhos.</p>
            <div className={styles.actions}>
              <button className={styles.secondaryButton} type="button" onClick={retryCamera}>Tirar outra</button>
              <button className={styles.primaryButton} type="button" onClick={() => void analyzePhoto()}>
                Enviar
              </button>
            </div>
          </div>
        )}

        {state === "analyzing" && (
          <div className={`${styles.analysisBanner} ${styles.step}`} role="status">
            <RefreshCw aria-hidden />
            <strong>Analisando sua selfie… leva de 10 a 60 segundos.</strong>
          </div>
        )}

        {state === "approved" && (
          <StatusPanel icon={<Check />} title="Tudo certo com sua selfie" copy="Sua identidade foi confirmada e esta etapa está concluída." tone="success">
            <button className={styles.primaryButton} type="button" onClick={onComplete}>Continuar</button>
          </StatusPanel>
        )}

        {state === "rejected" && (
          <StatusPanel icon={<AlertTriangle />} title="A foto ficou difícil de conferir" copy={rejectionReason || "Tente novamente com mais luz, sem óculos escuros e mantendo o rosto inteiro dentro da marcação."} tone="warning">
            <button className={styles.primaryButton} type="button" onClick={retryCamera}>Tirar nova selfie</button>
            {hubWhatsapp && (
              <a className={styles.textButton} href={`https://wa.me/${hubWhatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                Falar com o polo no WhatsApp
              </a>
            )}
          </StatusPanel>
        )}

        {state === "manual-review" && (
          <StatusPanel icon={<Clock3 />} title="Recebemos sua foto" copy="Ela precisa de uma conferência rápida da equipe. Você pode continuar e avisaremos quando terminar." tone="info">
            <button className={styles.primaryButton} type="button" onClick={onComplete}>Continuar cadastro</button>
          </StatusPanel>
        )}

        {state === "network-error" && (
          <StatusPanel icon={<WifiOff />} title="Sua foto continua aqui" copy={networkErrorMessage || "A conexão falhou antes do envio. Confira a internet e tente de novo — não precisa tirar outra selfie."} tone="danger">
            <button className={styles.primaryButton} type="button" onClick={() => void analyzePhoto()}>Enviar novamente</button>
            <button className={styles.textButton} type="button" onClick={retryCamera}>Prefiro tirar outra</button>
          </StatusPanel>
        )}

        {state === "camera-error" && (
          <StatusPanel
            icon={<Camera />}
            title={isPermissionDenied ? "A câmera está bloqueada" : "Câmera indisponível"}
            copy={isPermissionDenied ? "Libere a câmera nas configurações do navegador e volte aqui, ou escolha uma foto pronta." : "Não encontramos uma câmera disponível. Você pode usar uma foto já tirada e seguir normalmente."}
            tone="danger"
          >
            <button className={styles.primaryButton} type="button" onClick={() => fileInputRef.current?.click()}>Escolher foto</button>
            <button className={styles.textButton} type="button" onClick={() => void openCamera()}>Tentar abrir novamente</button>
          </StatusPanel>
        )}
      </div>

      {onBack && state !== "analyzing" && (
        <button className={styles.backButton} type="button" onClick={onBack}>← Voltar</button>
      )}

      <input ref={fileInputRef} className={styles.fileInput} type="file" accept="image/*" capture="user" onChange={selectPhoto} />
      <p className={styles.liveRegion} aria-live="polite">{stateTitle(state)}</p>
    </section>
  );
}

function SelfieHero() {
  return (
    <svg className={styles.selfieHero} viewBox="0 0 150 150" fill="none" aria-hidden>
      <defs>
        <linearGradient id="selfie-hero-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4dca0" />
          <stop offset="0.5" stopColor="#d9b15a" />
          <stop offset="1" stopColor="#b07f30" />
        </linearGradient>
      </defs>
      <rect x="40" y="10" width="70" height="130" rx="14" fill="#1d1d20" stroke="url(#selfie-hero-gold)" strokeWidth="2.2" />
      <circle cx="75" cy="20" r="2.4" fill="#f0d493" />
      <rect x="48" y="28" width="54" height="94" rx="8" fill="#0d0d0f" stroke="rgba(231,228,221,0.12)" />
      <circle cx="75" cy="58" r="13" fill="rgba(217,177,90,0.1)" stroke="url(#selfie-hero-gold)" strokeWidth="1.8" />
      <circle cx="70" cy="56" r="1.7" fill="#f0d493" />
      <circle cx="80" cy="56" r="1.7" fill="#f0d493" />
      <path d="M70 63c2.2 2.6 7.8 2.6 10 0" stroke="#f0d493" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M56 114c2.5-13 35.5-13 38 0" stroke="url(#selfie-hero-gold)" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M54 40v-5h5M96 40v-5h-5M54 110v5h5M96 110v5h-5" stroke="rgba(240,212,147,0.6)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="75" cy="132" r="4" stroke="url(#selfie-hero-gold)" strokeWidth="1.8" />
      <path className={styles.sparkle} d="M120 30l1.8 5.4 5.4 1.8-5.4 1.8-1.8 5.4-1.8-5.4-5.4-1.8 5.4-1.8z" fill="#f0d493" />
    </svg>
  );
}

function StatusPanel({
  icon,
  title,
  copy,
  busy = false,
  tone = "info",
  children,
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
  busy?: boolean;
  tone?: "success" | "warning" | "danger" | "info";
  children?: React.ReactNode;
}) {
  return (
    <div className={`${styles.statusPanel} ${styles[tone]} ${styles.step}`} role={tone === "danger" ? "alert" : "status"}>
      <div className={`${styles.statusIcon} ${busy ? styles.spinning : ""}`} aria-hidden>{icon}</div>
      <h2>{title}</h2>
      <p>{copy}</p>
      {children && <div className={styles.statusActions}>{children}</div>}
    </div>
  );
}

function FaceIllustration() {
  return (
    <svg className={styles.faceIllustration} viewBox="0 0 120 150" fill="none" aria-hidden>
      <defs>
        <linearGradient id="selfie-preview-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4dca0" />
          <stop offset="0.5" stopColor="#d9b15a" />
          <stop offset="1" stopColor="#b07f30" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="52" r="26" fill="rgba(217,177,90,0.1)" stroke="url(#selfie-preview-gold)" strokeWidth="2" />
      <circle cx="51" cy="49" r="2.6" fill="rgba(240,212,147,0.9)" />
      <circle cx="69" cy="49" r="2.6" fill="rgba(240,212,147,0.9)" />
      <path d="M51 62c4 4.6 14 4.6 18 0" stroke="rgba(240,212,147,0.9)" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M22 132c4-24 72-24 76 0" stroke="url(#selfie-preview-gold)" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
