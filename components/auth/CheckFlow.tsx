"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Field, FieldError, ReadOnlyField } from "@/components/ui/Field";

type CheckOut = {
  found: boolean;
  external_id?: string;
  otp_sent: boolean;
  otp_wait?: number;
  whatsapp?: boolean;
  roles?: string[];
};

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

  function restart() {
    setStage("check");
    setOtp("");
    setCpf("");
    setEmail("");
    setExternalId(null);
    setError(null);
  }

  // Etapa 1 — telefone. check() (users/auth/service.py → CheckOut) decide o caminho:
  //   found=true                  → já cadastrado, OTP disparado → vai pro código
  //   found=false, whatsapp=true  → número novo com zap → cadastro (telefone travado)
  //   found=false, whatsapp=false → número sem WhatsApp → não vale
  //   found=false, whatsapp=null  → WhatsApp fora do ar → pede pra tentar de novo
  async function onCheck(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.replace(/\D/g, "") }),
      });
      const data: CheckOut | { detail: string; code?: string } = await res.json();
      if (!res.ok) {
        setError(data as { detail: string; code?: string });
        return;
      }
      const out = data as CheckOut;
      if (out.found) {
        // external_id do CheckOut já é o do USER (o que o login espera).
        setExternalId(out.external_id ?? null);
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
      setError({ detail: "Falha de rede. Tente de novo." });
    } finally {
      setLoading(false);
    }
  }

  // Etapa 2 (só número novo) — CPF + e-mail. O register dispara o OTP.
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
        }),
      });
      const data: {
        external_id?: string;
        user_external_id?: string;
        detail?: string;
        code?: string;
      } = await res.json();
      if (!res.ok) {
        setError({ detail: data.detail ?? "Falha no cadastro.", code: data.code });
        return;
      }
      // register devolve external_id do CANDIDATO + user_external_id do USER;
      // o login espera o do USER (CandidateOut em api/collaborators.py).
      setExternalId(data.user_external_id ?? null);
      setStage("otp");
    } catch {
      setError({ detail: "Falha de rede. Tente de novo." });
    } finally {
      setLoading(false);
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
      const data: { ok?: boolean; detail?: string; code?: string } = await res.json();
      if (!res.ok) {
        setError({ detail: data.detail ?? "Falha no login.", code: data.code });
        return;
      }
      router.push("/painel");
      router.refresh();
    } catch {
      setError({ detail: "Falha de rede. Tente de novo." });
    } finally {
      setLoading(false);
    }
  }

  if (stage === "otp") {
    return (
      <form onSubmit={onLogin} className="space-y-5">
        <p className="text-muted-on-dark text-sm">
          Mandamos um código de 6 dígitos no WhatsApp. Digite abaixo.
        </p>
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
          className="text-gold-soft text-sm underline block w-fit mx-auto px-3 py-3 cursor-pointer hover:text-gold-soft/80"
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
        <p className="text-muted-on-dark text-sm">
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
