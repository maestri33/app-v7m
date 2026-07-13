"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field, FieldError, ReadOnlyField } from "@/components/ui/field";

type CheckOut = {
  found: boolean;
  external_id?: string;
  otp_sent: boolean;
  otp_wait?: number;
  whatsapp?: boolean;
  roles?: string[];
};

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
      // O OTP sai SÓ por WhatsApp — não há canal de e-mail.
      return "Não conseguimos enviar o código. Confira se esse número tem WhatsApp ativo e tente de novo.";
    default:
      return detail ?? "Não deu pra completar agora. Tente de novo em instantes.";
  }
}

// check → (login | cadastro inline) → otp. Um fluxo só, a partir do telefone.
// É a entrada do app — vive na home (/).
type Stage = "check" | "register" | "otp";

export function CheckFlow() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("check");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [externalId, setExternalId] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ detail: string; code?: string } | null>(null);
  // Cooldown de reenvio do código — começa no `otp_wait` do backend.
  const [resendIn, setResendIn] = useState(0);
  const [resending, setResending] = useState(false);
  // `otp_sent` honesto do backend: false quando rate-limitado (ou dispatch falhou).
  // Nunca prometer "mandamos o código" sem o backend confirmar que mandou.
  const [otpSent, setOtpSent] = useState(true);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  // Captura ?ref= da URL na entrada, uma só vez, via lazy initializer (sem efeito).
  // NESTE app (do promotor) ref = external_id do POLO (hub), NÃO id de promotor —
  // a confusão "ref=promotor" é do funil de LEAD, que vive no app do aluno. O
  // register repassa como `hub` pra o candidato cair no polo certo (senão vai pro
  // polo padrão e não aparece pra um coordenador não-padrão).
  const [hubRef] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("ref");
  });

  function restart() {
    setStage("check");
    setOtp("");
    setPhone("");
    setCpf("");
    setEmail("");
    setExternalId(null);
    setError(null);
    setOtpSent(true);
  }

  // Etapa 1 — check() por TELEFONE. O backend deriva o WhatsApp do número e
  // decide o caminho:
  //   found=true                  → já cadastrado, OTP disparado → vai pro código
  //   found=false, whatsapp=true  → número novo com zap → cadastro (telefone travado)
  //   found=false, whatsapp=false → número sem WhatsApp → não vale
  //   found=false, whatsapp=null  → WhatsApp fora do ar → pede pra tentar de novo
  async function onCheck(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const phoneDigits = phone.replace(/\D/g, "");
    const body: { phone?: string } = phoneDigits ? { phone: phoneDigits } : {};
    try {
      const res = await fetch("/api/auth/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
        // external_id do CheckOut já é o do USER (o que o login espera).
        setExternalId(out.external_id ?? null);
        setResendIn(out.otp_wait ?? 60);
        setOtpSent(out.otp_sent ?? true);
        setStage("otp");
        return;
      }
      if (out.whatsapp === true) {
        setStage("register");
        return;
      }
      if (out.whatsapp === false) {
        setError({
          detail: "Esse número não tem WhatsApp. Confira o DDD e tente outro.",
        });
        return;
      }
      // whatsapp == null → validação do WhatsApp fora do ar (≠ "sem zap").
      setError({
        detail: "Não deu pra validar o WhatsApp agora. Tente de novo em instantes.",
      });
    } catch {
      setError({ detail: "A conexão oscilou. Tente de novo — nada foi perdido." });
    } finally {
      setLoading(false);
    }
  }

  // Etapa 2 (só número novo) — CPF + e-mail. O telefone vem travado do check
  // (é pra onde vai o OTP). O register dispara o OTP.
  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.replace(/\D/g, ""),
          cpf: cpf.replace(/\D/g, ""),
          email: email.trim().toLowerCase(),
          // ref da URL = polo (hub); o back vincula o candidato a esse polo.
          ...(hubRef ? { hub: hubRef } : {}),
        }),
      });
      const data: {
        external_id?: string;
        user_external_id?: string;
        // otp_sent/otp_wait ainda NÃO estão no CandidateOut (schema Ninja) — chegam
        // undefined hoje. O cadastro não é derrubado por falha de OTP, então o
        // default `true` preserva o fluxo atual e passa a valer sozinho quando
        // o backend surfacar o campo.
        otp_sent?: boolean;
        otp_wait?: number;
        detail?: string;
        code?: string;
        retry_after_s?: number;
      } = await res.json();
      if (!res.ok) {
        setError({ detail: authErrorMessage(data.code, data.detail, data), code: data.code });
        return;
      }
      // register devolve external_id do CANDIDATO + user_external_id do USER;
      // o login espera o do USER (CandidateOut em api/collaborators.py).
      setExternalId(data.user_external_id ?? null);
      setResendIn(data.otp_wait ?? 60);
      setOtpSent(data.otp_sent ?? true);
      setStage("otp");
    } catch {
      setError({ detail: "A conexão oscilou. Tente de novo — nada foi perdido." });
    } finally {
      setLoading(false);
    }
  }

  // Reenvio do código: re-chama o check com o MESMO telefone (o backend
  // redispara o OTP) e reinicia o cooldown.
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
        if (data.code === "RATE_LIMITED" && data.retry_after_s) {
          setResendIn(data.retry_after_s);
        }
        return;
      }
      setResendIn(data.otp_wait ?? 60);
      setOtpSent(data.otp_sent ?? true);
    } catch {
      setError({ detail: "A conexão oscilou. Tente de novo — nada foi perdido." });
    } finally {
      setResending(false);
    }
  }

  // Etapa 3 — código do WhatsApp → login.
  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!externalId) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ external_id: externalId, otp }),
      });
      const data: { ok?: boolean; detail?: string; code?: string; retry_after_s?: number } =
        await res.json();
      if (!res.ok) {
        setError({ detail: authErrorMessage(data.code, data.detail, data), code: data.code });
        return;
      }
      router.push("/painel");
      router.refresh();
    } catch {
      setError({ detail: "A conexão oscilou. Tente de novo — nada foi perdido." });
    } finally {
      setLoading(false);
    }
  }

  if (stage === "otp") {
    return (
      <form onSubmit={onLogin} className="space-y-5">
        {otpSent ? (
          <p className="text-brand-muted-on-dark text-sm">
            Mandamos um código de 6 dígitos no WhatsApp. Digite abaixo.
          </p>
        ) : (
          <p role="alert" className="text-brand-warn text-sm">
            Não conseguimos enviar um código agora. Se você já tem um código válido,
            digite abaixo — senão, use “Reenviar código”.
          </p>
        )}
        <Field
          tone="dark"
          label="Código"
          value={otp}
          onChange={(v) => setOtp(v.replace(/\D/g, ""))}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoFocus
          inputClassName="text-xl tracking-[0.4em] text-center"
        />
        <FieldError tone="dark">{error?.detail}</FieldError>
        <Button type="submit" size="xl" loading={loading} className="w-full">
          {loading ? "Entrando…" : "Entrar"}
        </Button>
        <button
          type="button"
          className="text-brand-gold-light text-sm underline block w-fit mx-auto px-3 py-3 cursor-pointer hover:text-brand-gold-light/80 disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
          onClick={resendOtp}
          disabled={resendIn > 0 || resending}
        >
          {resending
            ? "Reenviando…"
            : resendIn > 0
              ? `Reenviar código (${resendIn}s)`
              : "Reenviar código"}
        </button>
        <button
          type="button"
          className="text-brand-gold-light text-sm underline block w-fit mx-auto px-3 py-3 cursor-pointer hover:text-brand-gold-light/80"
          onClick={restart}
        >
          Usar outro número
        </button>
      </form>
    );
  }

  if (stage === "register") {
    return (
      <form onSubmit={onRegister} className="space-y-5">
        <p className="text-brand-muted-on-dark text-sm">
          Número novo por aqui. Confirme seus dados pra criar seu cadastro.
        </p>
        <ReadOnlyField
          tone="dark"
          label="Telefone (WhatsApp)"
          value={phone}
          hint="É pra onde vai o código — por isso fica travado."
        />
        <Field
          tone="dark"
          label="CPF"
          value={cpf}
          onChange={setCpf}
          inputMode="numeric"
          placeholder="000.000.000-00"
          required
          autoFocus
        />
        <Field
          tone="dark"
          label="E-mail"
          value={email}
          onChange={setEmail}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="voce@email.com"
          required
        />
        <FieldError tone="dark">{error?.detail}</FieldError>
        <Button type="submit" size="xl" loading={loading} className="w-full">
          {loading ? "Criando…" : "Criar cadastro"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={onCheck} className="space-y-5">
      <p className="text-brand-muted-on-dark text-sm">
        Entre com seu telefone/WhatsApp.
      </p>
      <Field
        tone="dark"
        label="Telefone (WhatsApp)"
        value={phone}
        onChange={setPhone}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="(00) 00000-0000"
        required
        autoFocus
      />
      <FieldError tone="dark">{error?.detail}</FieldError>
      <Button type="submit" size="xl" loading={loading} className="w-full">
        {loading ? "Verificando…" : "Continuar"}
      </Button>
    </form>
  );
}
