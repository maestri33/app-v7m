"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Field, FieldError, ReadOnlyField } from "@/components/ui/Field";
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
        <Field
          label="CEP"
          value={cep}
          onChange={(v) => setCep(formatCep(v))}
          inputMode="numeric"
          placeholder="00000-000"
          required
        />
        <FieldError>{error}</FieldError>
        <Button type="submit" size="xl" loading={pending} className="w-full">
          {pending ? "Buscando…" : "Buscar CEP"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <ReadOnlyField className="col-span-2" label="CEP" value={cep} />
        <Field label="Número" value={number} onChange={setNumber} required inputMode="numeric" />
      </div>
      <Field label="Rua" value={street} onChange={setStreet} />
      <Field label="Complemento" value={complement} onChange={setComplement} />
      <Field label="Bairro" value={neighborhood} onChange={setNeighborhood} />
      <div className="grid grid-cols-3 gap-3">
        <ReadOnlyField className="col-span-2" label="Cidade" value={city} />
        <ReadOnlyField className="col-span-1" label="UF" value={state} />
      </div>
      <FieldError>{error}</FieldError>
      <Button type="submit" size="xl" loading={pending} className="w-full">
        {pending ? "Salvando…" : "Salvar e continuar"}
      </Button>
    </form>
  );
}
