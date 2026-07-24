"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { NEXT_STAGE, wrongStatusHref } from "@/lib/candidate/funnel";
import { validateCpf } from "@/lib/auth/masks";
import styles from "./PixForm.module.css";

/**
 * Sem seletor de tipo: detectamos pelo formato do que foi digitado/colado.
 * 11 dígitos é ambíguo (CPF ou celular) → no submit tenta CPF e, se o DICT
 * reprovar (422 PIX_INVALID), tenta PHONE (+55…). ⚠️ Cada chamada move R$0,01
 * no DICT — submit explícito ÚNICO, nunca validar por tecla; no caso ambíguo
 * são no máximo 2 chamadas.
 */
type DetectedType = "EMAIL" | "EVP" | "CNPJ" | "PHONE" | "CPF" | "AMBIGUOUS";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function detectKeyType(raw: string): DetectedType | null {
  const v = raw.trim();
  if (!v) return null;
  if (v.includes("@")) return "EMAIL";
  if (UUID_RE.test(v)) return "EVP";
  const digits = v.replace(/\D/g, "");
  if (v.trim().startsWith("+")) {
    // +55 + DDD + número (10 ou 11 dígitos locais)
    return digits.length >= 12 && digits.length <= 13 ? "PHONE" : null;
  }
  if (/[a-z]/i.test(v)) return null; // letras sem @ não são chave conhecida
  if (digits.length === 14) return "CNPJ";
  if (digits.length === 10) return "PHONE";
  if (digits.length === 11) return "AMBIGUOUS"; // CPF ou celular
  return null;
}

const TYPE_LABELS: Record<DetectedType, string> = {
  CPF: "CPF",
  CNPJ: "CNPJ",
  EMAIL: "E-mail",
  PHONE: "Celular",
  EVP: "Chave aleatória",
  AMBIGUOUS: "CPF ou celular",
};

const TYPE_ICONS: Record<Exclude<DetectedType, "AMBIGUOUS">, React.ReactNode> = {
  EMAIL: <path d="M3 6h18v12H3zM3 7l9 6 9-6" />,
  EVP: <><circle cx="8" cy="15" r="4" /><path d="M11 12 21 2m-4 4 3 3m-6 0 2 2" /></>,
  CNPJ: <><path d="M5 21V5a2 2 0 0 1 2-2h7v18m0-12h5v12M9 7h1m-1 4h1m-1 4h1M4 21h17" /></>,
  PHONE: <><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M11 17h2" /></>,
  CPF: <><path d="M3 5h18v14H3zM7 9.5h4M7 13h6m2-3.5h2.5" /></>,
};

/** Normaliza pro shape que o DICT espera por tipo. */
function normalizeKey(key: string, type: Exclude<DetectedType, "AMBIGUOUS">): string {
  const v = key.trim();
  if (type === "PHONE") {
    const digits = v.replace(/\D/g, "");
    return v.startsWith("+") ? `+${digits}` : `+55${digits}`;
  }
  if (type === "CPF" || type === "CNPJ") return v.replace(/\D/g, "");
  return v;
}

// Erros roteados por `code` (envelope {detail, code}) — nunca parseando detail.
function pixErrorMessage(code: string | undefined, detail: string | undefined) {
  switch (code) {
    case "PIX_INVALID":
      return "Essa chave não apareceu no seu CPF. Sem estresse: confira se digitou certo — ela precisa ser sua, do mesmo CPF do cadastro.";
    default:
      return detail ?? "Não deu pra validar agora. Tente de novo em instantes.";
  }
}

export function PixForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checkingLabel, setCheckingLabel] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resolvedType, setResolvedType] = useState<Exclude<DetectedType, "AMBIGUOUS"> | null>(null);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [noticeSeen, setNoticeSeen] = useState(false);
  const [shaking, setShaking] = useState(false);

  const detected = detectKeyType(key);
  const badges: Exclude<DetectedType, "AMBIGUOUS">[] = detected
    ? detected === "AMBIGUOUS"
      ? resolvedType
        ? [resolvedType]
        : ["CPF", "PHONE"]
      : [detected]
    : [];
  const isDanger = detected === "CNPJ" || Boolean(error);
  const canValidate = Boolean(detected) && !pending;

  function hint() {
    if (!key.trim()) return "Precisa ser uma chave SUA, no seu nome.";
    if (detected === "CNPJ") return "Chave CNPJ não é aceita — só pessoa física.";
    if (detected === "AMBIGUOUS" && !resolvedType) return "Pode ser CPF ou celular — escolha o tipo correto.";
    if (detected === "AMBIGUOUS" && resolvedType) return `Enviaremos como ${TYPE_LABELS[resolvedType]}.`;
    if (detected) return `Detectamos: ${TYPE_LABELS[detected]}`;
    return "Ainda não reconhecemos esse formato — confira se digitou certo.";
  }

  function fail(message: string) {
    setError(message);
    setShaking(false);
    requestAnimationFrame(() => {
      setShaking(true);
      window.setTimeout(() => setShaking(false), 430);
    });
  }

  async function validate(keyType: Exclude<DetectedType, "AMBIGUOUS">) {
    const res = await fetch("/api/me/pix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: normalizeKey(key, keyType),
        key_type: keyType,
      }),
    });
    const data: { detail?: string; code?: string; expected_status?: string } =
      await res.json();
    return { ok: res.ok, status: res.status, data };
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!detected || pending) return;
    if (detected === "CNPJ") {
      fail("Chave CNPJ não é aceita — só entra pessoa física. Use uma chave no seu CPF.");
      return;
    }
    if (detected === "AMBIGUOUS" && !resolvedType) {
      fail("Esse número pode ser CPF ou celular — toque no tipo correto ali em cima.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        let result;
        if (detected === "AMBIGUOUS") {
          // 11 dígitos: se não passam nos DVs do CPF, é celular — pula direto o
          // DICT do CPF (economiza a chamada paga). DV ok → tenta CPF; 422
          // PIX_INVALID → tenta celular. Aprovou = ficou. NÃO bloqueia: celular
          // legítimo nunca passa em validateCpf, então bloquear quebraria PHONE.
          if (resolvedType === "CPF" && !validateCpf(key)) {
            setCheckingLabel("Conferindo como CPF e celular…");
            result = await validate("CPF");
            if (!result.ok && result.status === 422 && result.data.code === "PIX_INVALID") {
              result = await validate("PHONE");
            }
          } else {
            setCheckingLabel("Conferindo como celular…");
            result = await validate("PHONE");
          }
        } else if (detected === "CPF") {
          // CPF puro: valida DVs no cliente antes de gastar R$0,01 no DICT.
          const cpfError = validateCpf(key);
          if (cpfError) {
            setError(cpfError);
            return;
          }
          setCheckingLabel(`Conferindo como ${TYPE_LABELS[detected]}…`);
          result = await validate(detected);
        } else {
          setCheckingLabel(`Conferindo como ${TYPE_LABELS[detected]}…`);
          result = await validate(detected);
        }
        if (!result.ok) {
          const redir = wrongStatusHref(result.data.code, result.data.expected_status);
          if (redir) {
            router.push(redir);
            return;
          }
          fail(pixErrorMessage(result.data.code, result.data.detail));
          return;
        }
        setSuccess(true);
        // Wizard auto-avançante: chave validada → direto pra selfie.
        router.push(NEXT_STAGE.pix);
      } catch {
        setError("A conexão oscilou. Tente de novo — nada foi perdido.");
      } finally {
        setCheckingLabel(null);
      }
    });
  }

  function onChange(value: string) {
    setKey(value);
    setError(null);
    setResolvedType(null);
    setSuccess(false);
  }

  return (
    <section className={styles.shell} aria-labelledby="pix-title">
      <div className={styles.ambient} aria-hidden="true">
        <svg className={styles.pig} viewBox="0 0 180 150" fill="none">
          <defs>
            <linearGradient id="pigg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f4dca0" />
              <stop offset="0.5" stopColor="#d9b15a" />
              <stop offset="1" stopColor="#b07f30" />
            </linearGradient>
          </defs>
          <g className={styles.noteA}><rect x="70" y="2" width="38" height="20" rx="3.5" fill="#1d1d20" stroke="#79d39b" strokeWidth="1.6" /><circle cx="89" cy="12" r="5.5" fill="none" stroke="#79d39b" strokeWidth="1.4" /></g>
          <g className={styles.noteB}><rect x="86" y="-4" width="32" height="17" rx="3" fill="#1d1d20" stroke="rgba(240,212,147,0.85)" strokeWidth="1.5" /><circle cx="102" cy="4.5" r="4.5" fill="none" stroke="rgba(240,212,147,0.85)" strokeWidth="1.3" /></g>
          <ellipse cx="90" cy="94" rx="58" ry="42" fill="#1d1d20" stroke="url(#pigg)" strokeWidth="2.2" />
          <rect x="72" y="48" width="36" height="7" rx="3.5" fill="#050506" stroke="url(#pigg)" strokeWidth="1.6" />
          <path d="M118 58l13-15 6 19z" fill="#1d1d20" stroke="url(#pigg)" strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx="118" cy="80" r="3" fill="#f0d493" />
          <ellipse cx="146" cy="94" rx="11" ry="9" fill="#232327" stroke="url(#pigg)" strokeWidth="1.8" />
          <circle cx="143" cy="94" r="1.7" fill="#f0d493" /><circle cx="149.5" cy="94" r="1.7" fill="#f0d493" />
          <rect x="56" y="128" width="12" height="15" rx="5" fill="#1d1d20" stroke="url(#pigg)" strokeWidth="1.7" />
          <rect x="108" y="128" width="12" height="15" rx="5" fill="#1d1d20" stroke="url(#pigg)" strokeWidth="1.7" />
          <path d="M34 86c-8-1-10 8-3.5 10 5 1.5 8-3.5 3.5-7" stroke="url(#pigg)" strokeWidth="2" strokeLinecap="round" fill="none" />
          <circle cx="78" cy="100" r="18" fill="#32BCAD" />
          <g transform="translate(65.2,87.2) scale(0.05)"><path fill="#fff" d="M392.5 122.9c-21.9 0-42.4 8.5-57.9 24l-63.9 63.9c-8 8-21.1 8.1-29.2 0l-63.6-63.6c-15.5-15.5-36-24-57.9-24h-8.3l80.7-80.7c25.1-25.1 65.8-25.1 90.9 0l80.4 80.4h-11.2zM119.9 389.4c21.9 0 42.4-8.5 57.9-24l63.6-63.6c7.8-7.8 21.4-7.8 29.2 0l63.9 63.9c15.5 15.5 36 24 57.9 24h11.2l-80.4 80.4c-25.1 25.1-65.8 25.1-90.9 0l-80.7-80.7h8.3zM430 175l55.8 55.8c25.1 25.1 25.1 65.8 0 90.9L430 377.5c-1.2-.5-2.6-.8-4-.8h-33.5c-15.1 0-29.9-6.1-40.6-16.8l-63.9-63.9c-20.1-20.2-55.2-20.2-75.4 0l-63.6 63.6c-10.7 10.7-25.5 16.8-40.6 16.8H70.6c-1.3 0-2.6.3-3.8.8l-56.1-56.1c-25.1-25.1-25.1-65.8 0-90.9L66.8 174c1.2.5 2.5.8 3.8.8h37.8c15.1 0 29.9 6.1 40.6 16.8l63.6 63.6c10.4 10.4 24 15.6 37.7 15.6s27.3-5.2 37.7-15.6l63.9-63.9c10.7-10.7 25.5-16.8 40.6-16.8H426c1.4 0 2.8-.3 4-.8z" /></g>
        </svg>
      </div>

      <form onSubmit={onSubmit} className={`${styles.card} ${shaking ? styles.shake : ""}`}>
        <div className={styles.progress} aria-hidden="true"><i /><i /><i /></div>
        <div className={styles.divider} aria-hidden="true" />
        <div className={styles.step}>
          <header className={styles.heading}>
            <p className={styles.eyebrow}>Recebimento</p>
            <h2 id="pix-title" className={styles.title}>Sua chave Pix</h2>
            <p className={styles.subtitle}>É nela que caem as comissões — digite que a gente identifica o tipo.</p>
          </header>

          <div className={styles.formContent}>
            <div className={styles.badges} aria-live="polite">
              {badges.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={[
                    styles.typeBadge,
                    resolvedType === type ? styles.selected : "",
                    type === "CNPJ" ? styles.danger : "",
                  ].filter(Boolean).join(" ")}
                  disabled={detected !== "AMBIGUOUS"}
                  aria-pressed={resolvedType === type}
                  onClick={() => {
                    if (detected === "AMBIGUOUS") {
                      setResolvedType(type);
                      setError(null);
                    }
                  }}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">{TYPE_ICONS[type]}</svg>
                  <span>{TYPE_LABELS[type]}</span>
                </button>
              ))}
            </div>

            <div>
              <label className="sr-only" htmlFor="pix-key">Chave Pix</label>
              <input
                id="pix-key"
                value={key}
                onFocus={() => {
                  if (!noticeSeen) setNoticeOpen(true);
                }}
                onChange={(event) => onChange(event.target.value)}
                autoComplete="off"
                placeholder="CPF, e-mail, celular ou chave aleatória"
                aria-invalid={isDanger}
                className={styles.input}
                required
              />
              <p className={[
                styles.hint,
                detected ? styles.hintDetected : "",
                detected === "CNPJ" ? styles.dangerText : "",
              ].filter(Boolean).join(" ")}>{hint()}</p>
            </div>

            {error && <p className={styles.error} role="alert">{error}</p>}
            {pending && checkingLabel && (
              <div className={`${styles.status} ${styles.waiting}`} role="status">
                <span className={styles.spinner} aria-hidden="true" />
                <span>{checkingLabel}</span>
              </div>
            )}
            {success && (
              <div className={`${styles.status} ${styles.success}`} role="status">
                <strong>Chave validada no banco ✓</strong>
                <span>Ela é sua e já está pronta pra receber. Vamos pra próxima etapa.</span>
              </div>
            )}

            {!success && (
              <button type="submit" className={styles.validate} disabled={!canValidate}>
                {pending ? "Validando…" : "Validar chave"}
              </button>
            )}
          </div>
        </div>
      </form>

      <button type="button" className={styles.back} onClick={() => router.push("/documento")}>
        ← Voltar
      </button>

      {noticeOpen && (
        <div className={styles.modalBackdrop} role="presentation">
          <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="notice-title">
            <div className={styles.ownerIcon} aria-hidden="true">
              <span /><i /><b />
            </div>
            <h2 id="notice-title">O PIX é <em>SEU</em></h2>
            <p>É nessa chave que você vai receber os pagamentos. Por isso ela precisa, <strong>obrigatoriamente, estar no seu nome</strong> — no mesmo CPF do cadastro.</p>
            <button
              type="button"
              autoFocus
              onClick={() => {
                setNoticeOpen(false);
                setNoticeSeen(true);
              }}
            >
              Estou ciente
            </button>
          </section>
        </div>
      )}
    </section>
  );
}
