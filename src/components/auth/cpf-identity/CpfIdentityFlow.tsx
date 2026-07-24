"use client";

import { ClipboardEvent, Fragment, KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";

import { isValidCpf, maskCpf, onlyCpfDigits } from "./cpf";

export type VerifyCpfResult =
  | { status: "matched"; name: string }
  | { status: "already-linked" }
  | { status: "unavailable"; message?: string };

export interface CpfIdentityFlowProps {
  verifyCpf: (cpf: string, signal: AbortSignal) => Promise<VerifyCpfResult>;
  onContinue: (result: { cpf: string; name: string }) => void;
  onBack?: () => void;
  initialCpf?: string;
  title?: string;
  successMessage?: string;
  successBadge?: string;
  continueLabel?: string;
}

type FlowState = "editing" | "checking" | "invalid" | "already-linked" | "unavailable" | "revealing" | "confirmed";

const SCRAMBLE_CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ@#&";

export function CpfIdentityFlow({
  verifyCpf,
  onContinue,
  onBack,
  initialCpf = "",
  title = "Qual é o seu CPF?",
  successMessage = "Documento pronto para continuar.",
  successBadge = "CPF validado",
  continueLabel = "Continuar",
}: CpfIdentityFlowProps) {
  const [cpf, setCpf] = useState(() => onlyCpfDigits(initialCpf));
  const [state, setState] = useState<FlowState>("editing");
  const [matchedName, setMatchedName] = useState("");
  const [visibleName, setVisibleName] = useState("");
  const [serverMessage, setServerMessage] = useState("");
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const requestRef = useRef<AbortController | null>(null);
  const titleId = useId();
  const hintId = useId();
  const isDiscovery = state === "revealing" || state === "confirmed";
  const remaining = 11 - cpf.length;
  const progress = (cpf.length / 11) * 100;
  const documentHint =
    state === "checking"
      ? "DOCUMENTO COMPLETO - CONSULTANDO"
      : cpf.length === 11
        ? "DOCUMENTO COMPLETO"
        : cpf.length
          ? `${remaining} ${remaining === 1 ? "DIGITO RESTANTE" : "DIGITOS RESTANTES"}`
          : "DIGITE NOS CAMPOS ABAIXO";

  const digits = useMemo(() => Array.from({ length: 11 }, (_, index) => cpf[index] ?? ""), [cpf]);

  useEffect(() => () => requestRef.current?.abort(), []);

  useEffect(() => {
    if (state !== "revealing" || !matchedName) return;
    let locked = 0;
    let interval: number | undefined;
    const startedAt = window.setTimeout(() => {
      interval = window.setInterval(() => {
        locked += 1;
        setVisibleName(
          matchedName
            .split("")
            .map((character, index) => {
              if (character === " ") return " ";
              if (index < locked) return character;
              return SCRAMBLE_CHARACTERS[Math.floor(Math.random() * SCRAMBLE_CHARACTERS.length)];
            })
            .join(""),
        );
        if (locked >= matchedName.length) {
          if (interval) window.clearInterval(interval);
          setVisibleName(matchedName);
          setState("confirmed");
        }
      }, 55);
    }, 650);
    return () => {
      window.clearTimeout(startedAt);
      if (interval) window.clearInterval(interval);
    };
  }, [matchedName, state]);

  async function checkCpf(value: string) {
    if (!isValidCpf(value)) {
      setState("invalid");
      return;
    }

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setServerMessage("");
    setState("checking");

    try {
      const result = await verifyCpf(value, controller.signal);
      if (controller.signal.aborted) return;
      if (result.status === "matched") {
        setMatchedName(result.name.toUpperCase());
        setVisibleName("");
        setState("revealing");
      } else if (result.status === "already-linked") {
        setCpf("");
        setState("already-linked");
      } else {
        setServerMessage(result.message ?? "Nao conseguimos consultar agora. Seus dados continuam aqui para tentar novamente.");
        setState("unavailable");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setServerMessage("A conexao falhou. Seus dados continuam aqui para tentar novamente.");
      setState("unavailable");
    }
  }

  useEffect(() => {
    if (onlyCpfDigits(initialCpf).length !== 11) return;
    const timeout = window.setTimeout(() => void checkCpf(onlyCpfDigits(initialCpf)), 180);
    return () => window.clearTimeout(timeout);
    // A verificação inicial depende somente do valor recebido; verifyCpf é
    // executado também nas edições seguintes pelo fluxo normal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCpf]);

  function updateCpf(nextValue: string) {
    const nextCpf = onlyCpfDigits(nextValue);
    setCpf(nextCpf);
    if (state !== "editing") setState("editing");
    if (nextCpf.length === 11) window.setTimeout(() => void checkCpf(nextCpf), 180);
  }

  function handleDigit(index: number, value: string) {
    const digit = onlyCpfDigits(value).slice(-1);
    const next = cpf.split("");
    next[index] = digit;
    updateCpf(next.join(""));
    if (digit && index < 10) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Backspace") return;
    if (digits[index]) {
      updateCpf(cpf.slice(0, index));
      return;
    }
    if (index > 0) {
      event.preventDefault();
      updateCpf(cpf.slice(0, index - 1));
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const pastedCpf = onlyCpfDigits(event.clipboardData.getData("text"));
    if (!pastedCpf) return;
    event.preventDefault();
    updateCpf(pastedCpf);
    inputRefs.current[Math.min(pastedCpf.length, 10)]?.focus();
  }

  function reviseCpf() {
    setCpf("");
    setState("editing");
    window.setTimeout(() => inputRefs.current[0]?.focus(), 0);
  }

  return (
    <section className="cpf-flow" aria-labelledby={titleId}>
      <div className={`cpf-card ${state === "invalid" ? "cpf-card--shake" : ""} ${state === "checking" ? "cpf-card--checking" : ""}`}>
        {!isDiscovery ? (
          <div className="cpf-card__content">
            <div className="cpf-steps" aria-hidden="true"><span /><span /><span /></div>
            <header className="cpf-flow__header">
              {onBack && <button className="cpf-flow__back" type="button" onClick={onBack} aria-label="Voltar">←</button>}
              <div>
                <span className="cpf-flow__eyebrow">Confirmacao de identidade</span>
                <h1 id={titleId}>{title}</h1>
              </div>
            </header>
            <div className="cpf-divider" />

            <div className="cpf-document">
              <div className="cpf-document__surface">
                <div className="cpf-document__stripe" />
                <span className="cpf-document__caption">Cadastro de pessoa fisica</span>
                <strong className="cpf-document__type">CPF</strong>
                <span className="cpf-document__portrait" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" /><path d="M5 21c1-5 4-7 7-7s6 2 7 7" /></svg>
                </span>
                <span className="cpf-document__number" aria-live="polite">{maskCpf(cpf)}</span>
                <span className="cpf-document__hint">{documentHint}</span>
                {cpf.length === 11 && <span className="cpf-document__check" aria-hidden="true">✓</span>}
              </div>
              <div className="cpf-progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
            </div>

            <div className="cpf-digits" onPaste={handlePaste} aria-describedby={hintId}>
              {digits.map((digit, index) => (
                <Fragment key={index}>
                  <input
                    ref={(element) => { inputRefs.current[index] = element; }}
                    value={digit}
                    onChange={(event) => handleDigit(index, event.target.value)}
                    onKeyDown={(event) => handleKeyDown(index, event)}
                    inputMode="numeric"
                    autoComplete="off"
                    aria-label={`Digito ${index + 1} do CPF`}
                    maxLength={1}
                    disabled={state === "checking"}
                  />
                  {(index === 2 || index === 5) && <span aria-hidden="true">·</span>}
                  {index === 8 && <span aria-hidden="true">-</span>}
                </Fragment>
              ))}
            </div>

            <div className="cpf-card__status" id={hintId} aria-live="polite">
              {state === "checking" ? <><span className="cpf-spinner" /> Conferindo...</> : "Digite aqui seu CPF."}
            </div>
          </div>
        ) : (
          <div className={`identity-discovery ${state === "confirmed" ? "identity-discovery--confirmed" : ""}`} aria-live="polite">
            <span className="identity-discovery__ornament">Documento conferido</span>
            <div className="identity-scroll">
              <div className="identity-scroll__rod" />
              <div className="identity-scroll__paper">
                <div className="identity-scroll__inset" />
                <div className="identity-scroll__content">
                  <div className="identity-scroll__portrait" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                    <span>Doc</span>
                  </div>
                  <strong>{visibleName || "••••••••••••••••"}</strong>
                  <span className="identity-scroll__rule" />
                  <p>{successMessage}</p>
                  <span className="identity-scroll__badge">✓ {successBadge}</span>
                </div>
              </div>
              <div className="identity-scroll__rod" />
            </div>
            <button type="button" onClick={() => onContinue({ cpf, name: matchedName })}>{continueLabel}</button>
          </div>
        )}
      </div>

      {(state === "invalid" || state === "already-linked" || state === "unavailable") && (
        <div className="cpf-dialog" role="alertdialog" aria-modal="true" aria-labelledby="cpf-dialog-title">
          <div className="cpf-dialog__panel">
            <span className="cpf-dialog__icon">{state === "invalid" ? "!" : state === "already-linked" ? "↗" : "↻"}</span>
            <h2 id="cpf-dialog-title">{state === "invalid" ? "Vamos conferir esse CPF?" : state === "already-linked" ? "CPF ja vinculado" : "Instabilidade no servidor"}</h2>
            <p>{state === "invalid" ? "Os numeros nao conferem. Revise com calma e digite de novo." : state === "already-linked" ? "Este CPF ja esta ligado a outro telefone. Fale com seu polo para recuperar o acesso com seguranca." : serverMessage}</p>
            <button type="button" autoFocus onClick={state === "unavailable" ? () => void checkCpf(cpf) : reviseCpf}>
              {state === "invalid" ? "Revisar CPF" : state === "already-linked" ? "Entendi" : "Tentar de novo"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
