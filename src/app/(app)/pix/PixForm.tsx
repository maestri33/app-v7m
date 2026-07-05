"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { NEXT_STAGE } from "@/lib/candidate/funnel";

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
      return "O DICT não confirmou essa chave no seu CPF. Confira se digitou certo — e lembre: a chave precisa ser SUA.";
    default:
      return detail ?? "Falha ao validar a chave. Tente de novo.";
  }
}

export function PixForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checkingLabel, setCheckingLabel] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const detected = detectKeyType(key);

  async function validate(keyType: Exclude<DetectedType, "AMBIGUOUS">) {
    const res = await fetch("/api/me/pix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: normalizeKey(key, keyType),
        key_type: keyType,
      }),
    });
    const data: { detail?: string; code?: string } = await res.json();
    return { ok: res.ok, status: res.status, data };
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!detected || pending) return;
    setError(null);
    startTransition(async () => {
      try {
        let result;
        if (detected === "AMBIGUOUS") {
          // 11 dígitos: tenta CPF; 422 PIX_INVALID → tenta celular. Aprovou = ficou.
          setCheckingLabel("Conferindo como CPF e celular no DICT…");
          result = await validate("CPF");
          if (!result.ok && result.status === 422 && result.data.code === "PIX_INVALID") {
            result = await validate("PHONE");
          }
        } else {
          setCheckingLabel(`Conferindo como ${TYPE_LABELS[detected]} no DICT…`);
          result = await validate(detected);
        }
        if (!result.ok) {
          setError(pixErrorMessage(result.data.code, result.data.detail));
          return;
        }
        setSuccess(true);
        // Wizard auto-avançante: chave validada → direto pra selfie.
        router.push(NEXT_STAGE.pix);
      } catch {
        setError("Falha de rede. Tente de novo.");
      } finally {
        setCheckingLabel(null);
      }
    });
  }

  if (success) {
    return (
      <div className="banner banner-ok" role="status">
        <p className="font-display">Chave validada ✓</p>
        <p className="text-sm mt-1 opacity-90">Titular confere. Vamos pra próxima etapa.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Field
        label="Chave"
        value={key}
        onChange={setKey}
        placeholder="CPF, e-mail, celular ou chave aleatória"
        hint={
          detected
            ? `Detectamos: ${TYPE_LABELS[detected]}`
            : key.trim()
              ? "Não reconhecemos esse formato ainda — confira se digitou certo."
              : "Precisa ser uma chave SUA, do mesmo CPF do cadastro — identificamos o tipo automaticamente."
        }
        required
      />
      {pending && checkingLabel && (
        <p className="flex items-center gap-2 text-sm font-medium text-brand-gold-ink" role="status">
          <span className="spinner" aria-hidden /> {checkingLabel}
        </p>
      )}
      <FieldError>{error}</FieldError>
      <Button
        type="submit"
        size="xl"
        loading={pending}
        disabled={!detected}
        className="w-full"
      >
        {pending ? "Validando…" : "Validar chave"}
      </Button>
      <p className="field-hint">
        A validação confere o titular no DICT e movimenta R$0,01 de verdade — por
        isso é um passo único, sem tentativas automáticas.
      </p>
    </form>
  );
}
