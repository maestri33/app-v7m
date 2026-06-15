"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { AddressSection } from "@/lib/api/types";

type Props = {
  initial: AddressSection;
};

function formatCep(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function EnderecoForm({ initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cep, setCep] = useState(initial.zipcode ?? "");
  const [number, setNumber] = useState(initial.number ?? "");
  const [complement, setComplement] = useState(initial.complement ?? "");
  const [street, setStreet] = useState(initial.street ?? "");
  const [neighborhood, setNeighborhood] = useState(initial.neighborhood ?? "");
  const [city, setCity] = useState(initial.city ?? "");
  const [state, setState] = useState(initial.state ?? "");
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<"cep" | "rest">(
    initial.zipcode ? "rest" : "cep",
  );

  function onCep(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/me/address", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cep: cep.replace(/\D/g, "") }),
        });
        const data: { detail?: string; address?: AddressSection } = await res.json();
        if (!res.ok) {
          setError(data.detail ?? "CEP não encontrado.");
          return;
        }
        // Backend devolve o me_dict.canônico; pega o address e re-renderiza.
        const a = (data as { address?: AddressSection }).address;
        if (a) {
          setStreet(a.street ?? "");
          setNeighborhood(a.neighborhood ?? "");
          setCity(a.city ?? "");
          setState(a.state ?? "");
          if (a.missing_fields.includes("number")) {
            // ok, pede o número
          }
        }
        setStage("rest");
      } catch {
        setError("Falha de rede. Tente de novo.");
      }
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/me/address", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            number: number || null,
            complement: complement || null,
            street: street || null,
            neighborhood: neighborhood || null,
            city: city || null,
            state: state || null,
          }),
        });
        const data: { detail?: string } = await res.json();
        if (!res.ok) {
          setError(data.detail ?? "Falha ao salvar o endereço.");
          return;
        }
        router.push("/painel");
        router.refresh();
      } catch {
        setError("Falha de rede. Tente de novo.");
      }
    });
  }

  if (stage === "cep") {
    return (
      <form onSubmit={onCep} className="space-y-5">
        <label className="block">
          <span className="block text-sm text-muted-on-dark mb-2">CEP</span>
          <input
            inputMode="numeric"
            required
            value={cep}
            onChange={(e) => setCep(formatCep(e.target.value))}
            placeholder="00000-000"
            className="w-full rounded-[var(--radius)] bg-char-2 border border-line-light/20 px-4 py-3 text-paper focus-visible:border-gold focus-visible:outline-none"
          />
        </label>
        {error && (
          <p className="text-sm text-red-300" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-xl w-full" disabled={pending}>
          {pending ? "Buscando…" : "Buscar CEP"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <FieldReadOnly className="col-span-2" label="CEP" value={cep} />
        <Field
          label="Número"
          value={number}
          onChange={setNumber}
          required
        />
      </div>
      <Field label="Rua" value={street} onChange={setStreet} />
      <Field label="Complemento" value={complement} onChange={setComplement} />
      <Field label="Bairro" value={neighborhood} onChange={setNeighborhood} />
      <div className="grid grid-cols-3 gap-3">
        <FieldReadOnly className="col-span-2" label="Cidade" value={city} />
        <FieldReadOnly className="col-span-1" label="UF" value={state} />
      </div>
      {error && (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-xl w-full" disabled={pending}>
        {pending ? "Salvando…" : "Salvar e continuar"}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-sm text-muted-on-dark mb-2">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-[var(--radius)] bg-char-2 border border-line-light/20 px-4 py-3 text-paper focus-visible:border-gold focus-visible:outline-none"
      />
    </label>
  );
}

function FieldReadOnly({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-sm text-muted-on-dark mb-2">{label}</span>
      <div className="rounded-[var(--radius)] bg-char border border-line-light/10 px-4 py-3 text-paper/70">
        {value || "—"}
      </div>
    </label>
  );
}
