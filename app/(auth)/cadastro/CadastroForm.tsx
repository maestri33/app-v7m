"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Field, FieldError } from "@/components/ui/Field";

type Stage = "register" | "otp";

export function CadastroForm() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("register");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [externalId, setExternalId] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ detail: string; code?: string } | null>(null);

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cpf: cpf.replace(/\D/g, ""),
          phone: phone.replace(/\D/g, ""),
          email: email.trim().toLowerCase(),
        }),
      });
      const data: { external_id?: string; detail?: string; code?: string } = await res.json();
      if (!res.ok) {
        setError({ detail: data.detail ?? "Falha no cadastro.", code: data.code });
        return;
      }
      setExternalId(data.external_id ?? null);
      setStage("otp");
    } catch {
      setError({ detail: "Falha de rede. Tente de novo." });
    } finally {
      setLoading(false);
    }
  }

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
      const data: { detail?: string; code?: string } = await res.json();
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
          Mandamos um código de 6 dígitos no WhatsApp. Digite abaixo pra começar.
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
          inputClassName="text-xl tracking-[0.4em] text-center"
        />
        <FieldError tone="dark">{error?.detail}</FieldError>
        <Button type="submit" size="xl" loading={loading} className="w-full">
          {loading ? "Entrando…" : "Entrar"}
        </Button>
        <button
          type="button"
          className="text-gold-soft text-sm underline block mx-auto cursor-pointer hover:text-gold-soft/80"
          onClick={() => setStage("register")}
        >
          Corrigir meus dados
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onRegister} className="space-y-5">
      <Field
        tone="dark"
        label="CPF"
        value={cpf}
        onChange={setCpf}
        inputMode="numeric"
        placeholder="000.000.000-00"
        required
      />
      <Field
        tone="dark"
        label="Telefone (WhatsApp)"
        value={phone}
        onChange={setPhone}
        type="tel"
        inputMode="tel"
        placeholder="(00) 00000-0000"
        required
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
        {loading ? "Enviando…" : "Começar"}
      </Button>
    </form>
  );
}
