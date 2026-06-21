"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { FieldError } from "@/components/ui/Field";

/**
 * Entrada do coordenador (área leadership). Login POR ÁREA — não usa o login do
 * colaborador. Fluxo: telefone → POST /api/leadership/auth/check (dispara 1 OTP;
 * se a pessoa não coordena polo, o back devolve detail + roles) → OTP →
 * POST /api/leadership/auth/login (emite JWT em contexto coordenador).
 *
 * Sem etapa de cadastro: coordenador é alguém que já coordena um Hub. Quem não
 * coordena é encaminhado pra entrada do colaborador (/).
 */

type Stage = "phone" | "otp";

type CheckOut = {
  found?: boolean;
  external_id?: string | null;
  is_coordinator?: boolean | null;
  roles?: string[] | null;
  detail?: string | null;
  // extras toleradas
  [k: string]: unknown;
};

function routeError(code: string | undefined, fallback: string): string {
  switch (code) {
    case "RATE_LIMITED":
      return "Muitas tentativas. Aguarde um instante e tente de novo.";
    case "NOT_HUB_COORDINATOR":
    case "FORBIDDEN_ROLE":
      return "Você não coordena um polo. Use a entrada do colaborador.";
    case "NOT_FOUND":
    case "PERSON_NOT_FOUND":
      return "Não achei ninguém com esse telefone.";
    case "SESSION_EXPIRED":
      return "Sessão expirada — comece de novo.";
    default:
      return fallback;
  }
}

export function LeadershipCheckFlow() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [externalId, setExternalId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onCheck(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/leadership/auth/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
        });
        const data: CheckOut & { code?: string; detail?: string } = await res.json();
        if (!res.ok) {
          setError(routeError(data.code, data.detail ?? "Não deu pra verificar o telefone."));
          return;
        }
        // check ok: OTP disparado. Se vier external_id, levamos pro login.
        if (data.external_id) setExternalId(data.external_id);
        setStage("otp");
      } catch {
        setError("Falha de rede. Tente de novo.");
      }
    });
  }

  function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/leadership/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ external_id: externalId, otp }),
        });
        const data: { ok?: boolean; code?: string; detail?: string } = await res.json();
        if (!res.ok) {
          setError(routeError(data.code, data.detail ?? "Não deu pra entrar."));
          return;
        }
        router.push("/coordenador");
        router.refresh();
      } catch {
        setError("Falha de rede. Tente de novo.");
      }
    });
  }

  if (stage === "otp") {
    return (
      <form onSubmit={onLogin} className="mt-8 flex flex-col gap-4">
        <Field
          label="Código (OTP)"
          value={otp}
          onChange={setOtp}
          tone="dark"
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          inputClassName="text-center tracking-[0.5em] text-lg"
          hint="Veja no seu WhatsApp."
        />
        {error && <FieldError tone="dark">{error}</FieldError>}
        <Button type="submit" size="xl" loading={pending}>
          Entrar
        </Button>
        <button
          type="button"
          onClick={() => {
            setStage("phone");
            setOtp("");
            setError(null);
          }}
          className="text-sm text-muted-on-dark hover:text-paper underline"
        >
          ← Trocar telefone
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onCheck} className="mt-8 flex flex-col gap-4">
      <Field
        label="Telefone (WhatsApp)"
        value={phone}
        onChange={setPhone}
        tone="dark"
        required
        type="tel"
        autoComplete="tel"
        placeholder="(11) 90000-0000"
      />
      {error && <FieldError tone="dark">{error}</FieldError>}
      <Button type="submit" size="xl" loading={pending}>
        Continuar
      </Button>
    </form>
  );
}