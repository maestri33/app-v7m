"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AlertCircle, Check } from "lucide-react";
import { validateEmail } from "@/lib/auth/masks";
import styles from "./PromoterEmailStep.module.css";

export type EmailVerificationResult =
  | { status: "available" }
  | { status: "taken"; message?: string }
  | { status: "blocked"; title?: string; message: string; actionLabel?: string };

export type EmailVerificationPhase = "input" | "checking" | "success";

export type PromoterEmailStepProps = {
  autoFocus?: boolean;
  initialEmail?: string;
  onComplete?: (email: string) => void;
  onPhaseChange?: (phase: EmailVerificationPhase) => void;
  successDurationMs?: number;
  verifyEmail: (
    email: string,
    signal: AbortSignal,
  ) => Promise<EmailVerificationResult>;
};

type ModalState =
  | { kind: "taken"; message: string }
  | { kind: "blocked"; title: string; message: string; actionLabel: string }
  | { kind: "network" }
  | null;

function EnvelopeArtwork({ flying = false }: { flying?: boolean }) {
  return (
    <div
      className={`${styles.envelopeArtwork} ${
        flying ? styles.envelopeFlying : styles.envelopeFloating
      }`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 220 150" role="presentation">
        <path className={styles.envelopeGlow} d="M28 32h164v94H28z" />
        <rect
          className={styles.envelopeFrame}
          x="24"
          y="30"
          width="172"
          height="96"
          rx="10"
        />
        <path
          className={styles.envelopeLine}
          d="M32 40 110 92 188 40"
        />
        <path
          className={styles.envelopeLineMuted}
          d="m32 118 58-43 20 14 20-14 58 43"
        />
        <circle className={styles.atBadge} cx="168" cy="116" r="22" />
        <text className={styles.atSign} x="168" y="123" textAnchor="middle">@</text>
      </svg>
    </div>
  );
}

export function PromoterEmailStep({
  autoFocus = false,
  initialEmail = "",
  onComplete,
  onPhaseChange,
  successDurationMs = 1900,
  verifyEmail,
}: PromoterEmailStepProps) {
  const titleId = useId();
  const helpId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const successTimerRef = useRef<number | null>(null);
  const [email, setEmail] = useState(initialEmail);
  const [phase, setPhase] = useState<EmailVerificationPhase>("input");
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [shakeSequence, setShakeSequence] = useState(0);

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [onPhaseChange, phase]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (successTimerRef.current !== null) {
        window.clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  function focusInput() {
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  async function runVerification(normalizedEmail: string) {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setError(null);
    setModal(null);
    setPhase("checking");

    try {
      const result = await verifyEmail(normalizedEmail, controller.signal);
      if (controller.signal.aborted) return;

      if (result.status === "taken") {
        const message =
          result.message ??
          "Este e-mail já está vinculado a outra conta. Use outro e-mail para continuar.";
        setPhase("input");
        setError(message);
        setModal({ kind: "taken", message });
        setShakeSequence((sequence) => sequence + 1);
        return;
      }

      if (result.status === "blocked") {
        setPhase("input");
        setError(result.message);
        setModal({
          kind: "blocked",
          title: result.title ?? "Revise seus dados",
          message: result.message,
          actionLabel: result.actionLabel ?? "Revisar",
        });
        setShakeSequence((sequence) => sequence + 1);
        return;
      }

      setPhase("success");
      successTimerRef.current = window.setTimeout(() => {
        onComplete?.(normalizedEmail);
      }, successDurationMs);
    } catch {
      if (controller.signal.aborted) return;
      setPhase("input");
      setModal({ kind: "network" });
      setShakeSequence((sequence) => sequence + 1);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase !== "input") return;

    const validationError = validateEmail(email);
    if (validationError) {
      setError(validationError);
      setShakeSequence((sequence) => sequence + 1);
      focusInput();
      return;
    }

    void runVerification(email.trim());
  }

  function handleEmailChange(event: React.ChangeEvent<HTMLInputElement>) {
    setEmail(event.target.value);
    if (error) setError(null);
  }

  function handleEmailBlur() {
    if (!email.trim()) return;
    setError(validateEmail(email));
  }

  function useAnotherEmail() {
    setModal(null);
    setEmail("");
    setError(null);
    focusInput();
  }

  function reviewEmail() {
    setModal(null);
    focusInput();
  }

  function retryVerification() {
    const normalizedEmail = email.trim();
    setModal(null);
    void runVerification(normalizedEmail);
  }

  const canSubmit = phase === "input" && email.trim().length > 0;

  return (
    <section
      className={styles.stage}
      aria-labelledby={titleId}
      data-testid="email-step"
      data-phase={phase}
    >
      {phase === "input" ? <EnvelopeArtwork /> : null}

      <div
        key={shakeSequence}
        className={`${styles.card} ${
          shakeSequence > 0 ? styles.cardShaking : ""
        }`}
      >
        {phase === "input" ? (
          <div className={styles.stepContent}>
            <p className={styles.kicker}>Contato</p>
            <h1 id={titleId}>Qual é seu melhor e-mail?</h1>
            <div className={styles.titleDivider} aria-hidden="true" />

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <label htmlFor={`${titleId}-email`}>E-mail</label>
              <div className={styles.inputShell}>
                <input
                  ref={inputRef}
                  id={`${titleId}-email`}
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  autoFocus={autoFocus}
                  value={email}
                  onBlur={handleEmailBlur}
                  onChange={handleEmailChange}
                  aria-describedby={`${helpId}${error ? ` ${helpId}-error` : ""}`}
                  aria-invalid={Boolean(error)}
                  placeholder="seuemail@provedor.com"
                />
              </div>

              <div className={styles.feedbackSlot} aria-live="polite">
                {error ? (
                  <p id={`${helpId}-error`} className={styles.errorMessage} role="alert">
                    <AlertCircle aria-hidden="true" size={17} />
                    {error}
                  </p>
                ) : null}
              </div>

              <button className={styles.continueButton} type="submit" disabled={!canSubmit}>
                Continuar
              </button>
            </form>
          </div>
        ) : null}

        {phase === "checking" ? (
          <div className={styles.centeredState} role="status" aria-live="polite">
            <span className={styles.spinner} aria-hidden="true" />
            <h1 id={titleId}>Verificando…</h1>
            <p>Isso leva só alguns segundos.</p>
          </div>
        ) : null}

        {phase === "success" ? (
          <div className={styles.centeredState} role="status" aria-live="polite">
            <div className={styles.successArtwork}>
              <EnvelopeArtwork flying />
              <span className={styles.successBadge} aria-hidden="true">
                <Check size={24} strokeWidth={3} />
              </span>
            </div>
            <h1 id={titleId}>E-mail confirmado!</h1>
            <p>Perfeito. Vamos para a próxima etapa.</p>
          </div>
        ) : null}
      </div>

      {modal ? (
        <div className={styles.modalBackdrop} role="presentation">
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${titleId}-modal-title`}
            aria-describedby={`${titleId}-modal-description`}
          >
            <span className={styles.modalIcon} aria-hidden="true">
              <AlertCircle size={28} />
            </span>
            <h2 id={`${titleId}-modal-title`}>
              {modal.kind === "taken"
                ? "E-mail já em uso"
                : modal.kind === "blocked"
                  ? modal.title
                  : "Não foi possível verificar"}
            </h2>
            <p id={`${titleId}-modal-description`}>
              {modal.kind === "taken"
                ? modal.message
                : modal.kind === "blocked"
                  ? modal.message
                  : "Tivemos uma instabilidade. Tente novamente ou revise o endereço informado."}
            </p>
            <div className={styles.modalActions}>
              {modal.kind === "taken" ? (
                <button type="button" onClick={useAnotherEmail} autoFocus>
                  Usar outro e-mail
                </button>
              ) : modal.kind === "blocked" ? (
                <button type="button" onClick={reviewEmail} autoFocus>
                  {modal.actionLabel}
                </button>
              ) : (
                <>
                  <button type="button" onClick={retryVerification} autoFocus>
                    Tentar novamente
                  </button>
                  <button className={styles.secondaryAction} type="button" onClick={reviewEmail}>
                    Revisar e-mail
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
