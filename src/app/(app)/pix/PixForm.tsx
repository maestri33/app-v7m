"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field, FieldError, SelectField } from "@/components/ui/field";

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
      <div className="banner banner-ok" role="status">
        <p className="font-display">Chave validada</p>
        <p className="text-sm mt-1 opacity-90">Vamos pra próxima etapa.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <SelectField
        label="Tipo"
        value={keyType}
        onChange={setKeyType}
        options={KEY_TYPES}
      />
      <Field
        label="Chave"
        value={key}
        onChange={setKey}
        placeholder={placeholderFor(keyType)}
        required
      />
      <FieldError>{error}</FieldError>
      <Button type="submit" size="xl" loading={pending} disabled={!key} className="w-full">
        {pending ? "Validando (R$0,01)…" : "Validar chave"}
      </Button>
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
