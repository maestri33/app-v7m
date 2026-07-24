"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { animate } from "motion";
import { BadgeCheck, CircleDollarSign, GraduationCap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { OtpInput } from "@/components/ui/otp-input";
import { AuthOverlay } from "@/components/auth/AuthShell";
import {
  PromoterEmailStep,
  type EmailVerificationResult,
} from "@/components/auth/PromoterEmailStep";
import {
  CpfIdentityFlow,
  type VerifyCpfResult,
} from "@/components/auth/cpf-identity/CpfIdentityFlow";
import {
  maskPhone,
  maskCpf,
  validatePhone,
} from "@/lib/auth/masks";

type CheckOut = {
  found: boolean;
  external_id?: string;
  otp_sent: boolean;
  otp_wait?: number;
  whatsapp?: boolean;
  roles?: string[];
};

const COLLABORATOR_ROLES = new Set(["candidate", "training", "promoter", "coordinator"]);

// Erros do cadastro/entrada roteados por `code` (envelope {detail, code, …}) —
// nunca parseando detail. Copy pt-BR acolhedora, com o caminho de saída.
function authErrorMessage(
  code: string | undefined,
  detail: string | undefined,
  extra?: { retry_after_s?: number },
): string {
  switch (code) {
    case "RATE_LIMITED":
      return `Muitas tentativas seguidas. Respira ${
        extra?.retry_after_s ? `${extra.retry_after_s} segundos` : "um instante"
      } e tente de novo.`;
    case "CPF_EXISTS":
      return "Esse CPF já tem cadastro por aqui — entre com o telefone dele.";
    case "PHONE_EXISTS":
      return "Esse telefone já tem cadastro — volte e entre com ele.";
    case "EMAIL_EXISTS":
      return "Esse e-mail já está em uso — se a conta é sua, entre com o telefone dela.";
    case "CPF_INVALID":
      return "Esse CPF não fechou — confira os números e tente de novo.";
    case "CPF_NOT_FOUND":
      return "Não achamos esse CPF na Receita. Confira os números — precisa ser o seu.";
    case "NO_HUB":
      return "Seu link de convite expirou ou veio incompleto — peça um novo pro coordenador do seu polo.";
    case "OTP_NOT_SENT":
      return "Não conseguimos enviar o código. Confira se esse número tem WhatsApp ativo e tente de novo.";
    case "NOT_IN_FUNNEL":
      return "Seu número existe, mas ainda não está no programa de promotores. Entre pelo link de indicação ou fale com o suporte.";
    case "JOIN_PROFILE_INCOMPLETE":
      return "Seu cadastro anterior está incompleto. Fale com o suporte para confirmar seus dados e liberar o acesso de promotor.";
    default:
      return detail ?? "Não deu pra completar agora. Tente de novo em instantes.";
  }
}

// check → (login | CPF → e-mail/register) → otp. Um fluxo só, a partir do telefone.
type Stage = "check" | "register" | "email" | "otp";

export function CheckFlow() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("check");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [externalId, setExternalId] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [error, setError] = useState<{ detail: string; code?: string } | null>(null);
  // Erros de validação client-side por campo (blur / após 1º erro).
  const [fieldErr, setFieldErr] = useState<Record<string, string | null>>({});
  const [resendIn, setResendIn] = useState(0);
  const [resending, setResending] = useState(false);
  const [otpSent, setOtpSent] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [needsJoin, setNeedsJoin] = useState(false);
  const [whatsappWarning, setWhatsappWarning] = useState(false);
  const registrationResultRef = useRef<{
    external_id?: string;
    user_external_id?: string;
    otp_sent?: boolean;
    otp_wait?: number;
  } | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  // Anima a troca de estágio (opacity + x). Motion respeita reduced-motion via CSS global.
  useEffect(() => {
    if (panelRef.current) {
      animate(
        panelRef.current,
        { opacity: [0, 1], transform: ["translateX(18px)", "translateX(0px)"] },
        { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
      );
    }
  }, [stage]);

  // ?ref= = external_id do POLO (hub); o register repassa p/ o candidato cair no polo certo.
  const [hubRef] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("ref");
  });

  function shake(el: HTMLElement | null) {
    if (!el) return;
    el.classList.remove("field-shake");
    void el.offsetWidth; // reflow p/ reiniciar a animação
    el.classList.add("field-shake");
  }

  function restart() {
    setStage("check");
    setOtp("");
    setPhone("");
    setCpf("");
    setEmail("");
    setExternalId(null);
    setError(null);
    setFieldErr({});
    setOtpSent(true);
    setNeedsJoin(false);
    setWhatsappWarning(false);
    setNotice(null);
    registrationResultRef.current = null;
  }

  async function onCheck(e: React.FormEvent) {
    e.preventDefault();
    const pErr = validatePhone(phone);
    setFieldErr({ phone: pErr });
    if (pErr) {
      shake(panelRef.current);
      return;
    }
    setError(null);
    setLoading(true);
    const phoneDigits = phone.replace(/\D/g, "");
    try {
      const res = await fetch("/api/auth/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneDigits }),
      });
      const data: CheckOut | { detail: string; code?: string; retry_after_s?: number } =
        await res.json();
      if (!res.ok) {
        const err = data as { detail: string; code?: string; retry_after_s?: number };
        setError({ detail: authErrorMessage(err.code, err.detail, err), code: err.code });
        return;
      }
      const out = data as CheckOut;
      if (out.found) {
        setExternalId(out.external_id ?? null);
        setNeedsJoin(
          Array.isArray(out.roles) && !out.roles.some((role) => COLLABORATOR_ROLES.has(role)),
        );
        setResendIn(out.otp_wait ?? 60);
        setOtpSent(out.otp_sent ?? true);
        setStage("otp");
        return;
      }
      setWhatsappWarning(out.whatsapp !== true);
      setStage("register");
    } catch {
      setError({ detail: "A conexão oscilou. Tente de novo — nada foi perdido." });
    } finally {
      setLoading(false);
    }
  }

  async function verifyCpfForRegistration(
    _cpfDigits: string,
    signal: AbortSignal,
  ): Promise<VerifyCpfResult> {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");

    // Nesta etapa conferimos apenas o formato e os dígitos verificadores,
    // já validados pelo CpfIdentityFlow. A existência é confirmada no cadastro,
    // sem usar /auth/check — esse endpoint pode disparar OTP para contas existentes.
    return { status: "matched", name: "CPF conferido" };
  }

  async function verifyRegistrationEmail(
    candidateEmail: string,
    signal: AbortSignal,
  ): Promise<EmailVerificationResult> {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.replace(/\D/g, ""),
          cpf: cpf.replace(/\D/g, ""),
          email: candidateEmail.trim().toLowerCase(),
          ...(hubRef ? { hub: hubRef } : {}),
        }),
        signal,
      });
      const data: {
        external_id?: string;
        user_external_id?: string;
        otp_sent?: boolean;
        otp_wait?: number;
        detail?: string;
        code?: string;
        retry_after_s?: number;
      } = await res.json();
      if (!res.ok) {
        const message = authErrorMessage(data.code, data.detail, data);

        if (data.code === "EMAIL_EXISTS") {
          return { status: "taken", message };
        }

        if (data.code === "CPF_INVALID" || data.code === "CPF_NOT_FOUND" || data.code === "CPF_EXISTS") {
          setFieldErr({ cpf: message });
          window.requestAnimationFrame(() => setStage("register"));
          return {
            status: "blocked",
            title: "Revise seu CPF",
            message,
            actionLabel: "Voltar ao CPF",
          };
        }

        return {
          status: "blocked",
          title: "Não foi possível criar o cadastro",
          message,
          actionLabel: "Revisar dados",
        };
      }

      registrationResultRef.current = data;
      setEmail(candidateEmail.trim().toLowerCase());
      return { status: "available" };
    } catch (err) {
      if (signal.aborted) throw err;
      throw err;
    } finally {
      setLoading(false);
    }
  }

  function completeRegistrationEmail() {
    const data = registrationResultRef.current;
    if (!data) return;
    setExternalId(data.user_external_id ?? data.external_id ?? null);
    const sent = data.otp_sent ?? true;
    setResendIn(data.otp_wait ?? (sent ? 60 : 0));
    setOtpSent(sent);
    setNeedsJoin(false);
    setStage("otp");
  }

  async function resendOtp() {
    if (resendIn > 0 || resending) return;
    setError(null);
    setResending(true);
    try {
      const res = await fetch("/api/auth/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.replace(/\D/g, "") }),
      });
      const data: CheckOut & { detail?: string; code?: string; retry_after_s?: number } =
        await res.json();
      if (!res.ok) {
        setError({ detail: authErrorMessage(data.code, data.detail, data), code: data.code });
        if (data.code === "RATE_LIMITED" && data.retry_after_s) setResendIn(data.retry_after_s);
        return;
      }
      setResendIn(data.otp_wait ?? 60);
      setOtpSent(data.otp_sent ?? true);
      setNotice("Código reenviado pro seu WhatsApp!");
      setTimeout(() => setNotice(null), 3500);
    } catch {
      setError({ detail: "A conexão oscilou. Tente de novo — nada foi perdido." });
    } finally {
      setResending(false);
    }
  }

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!externalId) return;
    if (otp.length !== 6) {
      setFieldErr({ otp: "O código tem 6 dígitos." });
      shake(panelRef.current);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(needsJoin ? "/api/auth/join" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          external_id: externalId,
          otp,
          ...(needsJoin && hubRef ? { hub: hubRef } : {}),
        }),
      });
      const data: { ok?: boolean; detail?: string; code?: string; retry_after_s?: number } =
        await res.json();
      if (!res.ok) {
        setError({ detail: authErrorMessage(data.code, data.detail, data), code: data.code });
        setFieldErr({ otp: "erro" });
        return;
      }
      // Sucesso → overlay + navegação direta pro painel (sem tela de sucesso).
      setNavigating(true);
      router.push("/painel");
      router.refresh();
    } catch {
      setError({ detail: "A conexão oscilou. Tente de novo — nada foi perdido." });
    } finally {
      setLoading(false);
    }
  }

  const stageNumber = stage === "check" ? 1 : stage === "register" ? 2 : stage === "email" ? 3 : 4;

  return (
    <div className="grid w-full items-center gap-8 lg:grid-cols-[minmax(0,1fr)_30rem] lg:gap-16">
      {navigating && <AuthOverlay />}

      <section className="hidden max-w-xl text-white lg:block" aria-label="Sobre o programa">
        <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.16em] text-[#ffdf00]">
          Programa de promotores V7M
        </p>
        <h1 className="max-w-lg text-[clamp(2.8rem,5vw,4.7rem)] font-extrabold leading-[0.98] tracking-[-0.055em]">
          Transforme conversas em oportunidades.
        </h1>
        <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/75">
          Indique pessoas, acompanhe cada matrícula e receba suas comissões via Pix em um painel simples.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {[
            [GraduationCap, "Ajude pessoas a voltar a estudar"],
            [CircleDollarSign, "Receba por matrícula confirmada"],
            [BadgeCheck, "Cadastro seguro e 100% online"],
          ].map(([Icon, label]) => {
            const BenefitIcon = Icon as typeof GraduationCap;
            return (
              <div key={label as string} className="flex items-center gap-3 text-sm font-semibold text-white/90">
                <span className="grid size-10 place-items-center rounded-xl bg-white/10">
                  <BenefitIcon aria-hidden className="size-5 text-[#ffdf00]" />
                </span>
                <span>{label as string}</span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mx-auto w-full max-w-[30rem]">
        <div className="mb-4 flex items-end justify-between gap-4 text-white">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#ffdf00]">Promotor V7M</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight">Entrar ou criar cadastro</h2>
          </div>
          <span className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white/75">
            Etapa {stageNumber} de 4
          </span>
        </div>

        <div className="auth-card" ref={panelRef}>
          {stage === "check" && (
            <form onSubmit={onCheck} className="space-y-5">
              <div>
                <h3 className="text-2xl font-extrabold tracking-tight text-[#102a3a]">Qual é o seu WhatsApp?</h3>
                <p className="mt-1 text-sm leading-relaxed text-[#53656f]">
                  Usamos o número para confirmar seu acesso e criar o cadastro quando necessário.
                </p>
              </div>
              <div>
                <label htmlFor="auth-phone" className="label">Telefone com DDD</label>
                <div className="relative">
                  <span className="phone-prefix">+55</span>
                  <input
                    id="auth-phone"
                    value={phone}
                    onChange={(e) => {
                      const masked = maskPhone(e.target.value);
                      setPhone(masked);
                      if (fieldErr.phone) setFieldErr({ phone: validatePhone(masked) });
                    }}
                    onBlur={() => setFieldErr({ phone: validatePhone(phone) })}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="(11) 98765-4321"
                    aria-invalid={!!fieldErr.phone}
                    autoFocus
                    className="input input-dark pl-16 text-center text-[16.5px] tabular-nums tracking-[0.03em]"
                  />
                </div>
                {fieldErr.phone && <p role="alert" className="field-error">{fieldErr.phone}</p>}
              </div>
              {error && <p role="alert" className="field-error rounded-xl bg-red-50 p-3">{error.detail}</p>}
              <Button type="submit" size="xl" loading={loading} className="w-full">
                {loading ? "Verificando…" : "Continuar"}
              </Button>
            </form>
          )}

          {stage === "register" && (
            <div className="-m-6 grid place-items-center gap-4 sm:-m-7">
              {whatsappWarning && (
                <div className="mx-6 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 sm:mx-7" role="status">
                  Não conseguimos confirmar o WhatsApp automaticamente. Você ainda pode criar o cadastro; o código recebido confirmará o número.
                </div>
              )}
              <CpfIdentityFlow
                initialCpf={cpf}
                verifyCpf={verifyCpfForRegistration}
                onBack={restart}
                onContinue={({ cpf: cpfDigits }) => {
                  setCpf(maskCpf(cpfDigits));
                  setError(null);
                  setFieldErr({});
                  setStage("email");
                }}
                successMessage="Seu CPF passou pela pré-checagem. A confirmação final acontece no cadastro."
                successBadge="CPF pronto"
                continueLabel="Continuar para e-mail"
              />
            </div>
          )}

          {stage === "email" && (
            <div className="-m-6 grid place-items-center sm:-m-7">
              <PromoterEmailStep
                autoFocus
                initialEmail={email}
                verifyEmail={verifyRegistrationEmail}
                onComplete={completeRegistrationEmail}
                successDurationMs={1200}
              />
            </div>
          )}

          {stage === "otp" && (
            <form onSubmit={onLogin} className="space-y-5">
              <div>
                <h3 className="text-2xl font-extrabold tracking-tight text-[#102a3a]">
                  {needsJoin ? "Confirme para criar seu acesso" : "Digite o código"}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-[#53656f]">
                  {otpSent ? <>Enviamos um código de 6 dígitos para <strong className="text-[#102a3a]">{phone || "seu WhatsApp"}</strong>.</> : "Não conseguimos enviar um código agora. Se você já tem um código válido, digite abaixo."}
                </p>
              </div>
              <OtpInput
                value={otp}
                onChange={(value) => {
                  setOtp(value);
                  if (fieldErr.otp) setFieldErr({ otp: null });
                }}
                error={!!fieldErr.otp}
                autoFocus
              />
              {(fieldErr.otp || error) && <p role="alert" className="field-error text-center">{error?.detail ?? "O código tem 6 dígitos."}</p>}
              {notice && <p className="text-center text-sm font-semibold text-[#007f31]">{notice}</p>}
              <Button type="submit" size="xl" loading={loading} className="w-full">
                {loading ? (needsJoin ? "Criando acesso…" : "Entrando…") : needsJoin ? "Confirmar e criar acesso" : "Entrar"}
              </Button>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={resendOtp}
                  disabled={resendIn > 0 || resending}
                  className="min-h-11 rounded-xl border border-[#d4e1db] px-4 text-sm font-bold text-[#007f31] transition-colors hover:bg-[#edf3f0] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {resending ? "Reenviando…" : resendIn > 0 ? `Reenviar em ${resendIn}s` : "Reenviar código"}
                </button>
                <button type="button" onClick={restart} className="min-h-11 px-3 text-sm font-semibold text-[#53656f] hover:text-[#102a3a]">Outro número</button>
              </div>
            </form>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-medium text-white/70">
          <span>Comissão por matrícula</span>
          <span>Pagamento via Pix</span>
          <span>100% online</span>
        </div>
      </div>
    </div>
  );
}
