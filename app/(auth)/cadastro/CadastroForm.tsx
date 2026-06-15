"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
        <label className="block">
          <span className="block text-sm text-muted-on-dark mb-2">Código</span>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            className="w-full rounded-[var(--radius)] bg-char-2 border border-line-light/20 px-4 py-3 text-paper text-xl tracking-widest text-center focus-visible:border-gold focus-visible:outline-none"
          />
        </label>
        {error && (
          <p className="text-sm text-red-300" role="alert">
            {error.detail}
          </p>
        )}
        <button type="submit" className="btn btn-xl w-full" disabled={loading}>
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onRegister} className="space-y-5">
      <label className="block">
        <span className="block text-sm text-muted-on-dark mb-2">CPF</span>
        <input
          required
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
          placeholder="000.000.000-00"
          className="w-full rounded-[var(--radius)] bg-char-2 border border-line-light/20 px-4 py-3 text-paper focus-visible:border-gold focus-visible:outline-none"
        />
      </label>
      <label className="block">
        <span className="block text-sm text-muted-on-dark mb-2">Telefone (WhatsApp)</span>
        <input
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(00) 00000-0000"
          className="w-full rounded-[var(--radius)] bg-char-2 border border-line-light/20 px-4 py-3 text-paper focus-visible:border-gold focus-visible:outline-none"
        />
      </label>
      <label className="block">
        <span className="block text-sm text-muted-on-dark mb-2">E-mail</span>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-[var(--radius)] bg-char-2 border border-line-light/20 px-4 py-3 text-paper focus-visible:border-gold focus-visible:outline-none"
        />
      </label>
      {error && (
        <p className="text-sm text-red-300" role="alert">
          {error.detail}
        </p>
      )}
      <button type="submit" className="btn btn-xl w-full" disabled={loading}>
        {loading ? "Enviando…" : "Começar"}
      </button>
    </form>
  );
}
