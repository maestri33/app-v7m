"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Field, FieldError } from "@/components/ui/Field";

type CheckOut = {
  found: boolean;
  external_id?: string;
  otp_sent: boolean;
  otp_wait?: number;
  whatsapp?: boolean;
  roles?: string[];
};

type Stage = "check" | "otp";

export function EntrarForm() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("check");
  const [cpfOrPhone, setCpfOrPhone] = useState("");
  const [externalId, setExternalId] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ detail: string; code?: string } | null>(null);

  async function onCheck(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const isCpf = /^\d+$/.test(cpfOrPhone.replace(/\D/g, ""));
      const payload = isCpf
        ? { cpf: cpfOrPhone.replace(/\D/g, "") }
        : { phone: cpfOrPhone.replace(/\D/g, "") };
      const res = await fetch("/api/auth/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data: CheckOut | { detail: string; code?: string } = await res.json();
      if (!res.ok) {
        setError(data as { detail: string; code?: string });
        return;
      }
      const ok = data as CheckOut;
      if (!ok.found) {
        setError({
          detail:
            "Não encontramos cadastro. Se for novo, cadastre-se na página de cadastro.",
          code: "NOT_FOUND",
        });
        return;
      }
      setExternalId(ok.external_id ?? null);
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
          Mandamos um código de 6 dígitos no WhatsApp cadastrado. Digite abaixo.
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
          onClick={() => setStage("check")}
        >
          Voltar
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onCheck} className="space-y-5">
      <Field
        tone="dark"
        label="CPF ou telefone"
        value={cpfOrPhone}
        onChange={setCpfOrPhone}
        inputMode="numeric"
        autoComplete="username"
        placeholder="000.000.000-00 ou (00) 00000-0000"
        required
      />
      <FieldError tone="dark">{error?.detail}</FieldError>
      <Button type="submit" size="xl" loading={loading} className="w-full">
        {loading ? "Verificando…" : "Continuar"}
      </Button>
    </form>
  );
}
