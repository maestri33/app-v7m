"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const KEY_TYPES = [
  { value: "CPF", label: "CPF" },
  { value: "CNPJ", label: "CNPJ" },
  { value: "EMAIL", label: "E-mail" },
  { value: "PHONE", label: "Telefone" },
  { value: "EVP", label: "Chave aleatória (EVP)" },
] as const;

type Props = {
  initial: { key?: string | null; key_type?: string | null; validated_at?: string | null };
};

export function PixForm({ initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [keyType, setKeyType] = useState<string>(initial.key_type ?? "CPF");
  const [key, setKey] = useState<string>(initial.key ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(!!initial.validated_at);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/me/pix", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: key.trim(), key_type: keyType }),
        });
        const data: { detail?: string; reason?: string } = await res.json();
        if (!res.ok) {
          setError(data.detail ?? data.reason ?? "Falha ao validar a chave.");
          return;
        }
        setSuccess(true);
        router.push("/painel");
        router.refresh();
      } catch {
        setError("Falha de rede. Tente de novo.");
      }
    });
  }

  if (success) {
    return (
      <p className="text-paper">
        Chave validada. Vamos pra próxima etapa.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <label className="block">
        <span className="block text-sm text-muted-on-dark mb-2">Tipo</span>
        <select
          value={keyType}
          onChange={(e) => setKeyType(e.target.value)}
          className="w-full rounded-[var(--radius)] bg-char-2 border border-line-light/20 px-4 py-3 text-paper focus-visible:border-gold focus-visible:outline-none"
        >
          {KEY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="block text-sm text-muted-on-dark mb-2">Chave</span>
        <input
          required
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder={placeholderFor(keyType)}
          className="w-full rounded-[var(--radius)] bg-char-2 border border-line-light/20 px-4 py-3 text-paper focus-visible:border-gold focus-visible:outline-none"
        />
      </label>
      {error && (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-xl w-full" disabled={pending || !key}>
        {pending ? "Validando (R$0,01)…" : "Validar chave"}
      </button>
    </form>
  );
}

function placeholderFor(t: string) {
  switch (t) {
    case "CPF":
      return "000.000.000-00";
    case "CNPJ":
      return "00.000.000/0000-00";
    case "EMAIL":
      return "voce@email.com";
    case "PHONE":
      return "(00) 00000-0000";
    case "EVP":
      return "00000000-0000-0000-0000-000000000000";
    default:
      return "";
  }
}
