"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { ProfileSection } from "@/lib/api/types";

const MARITAL = [
  { value: "", label: "—" },
  { value: "single", label: "Solteiro(a)" },
  { value: "married", label: "Casado(a)" },
  { value: "divorced", label: "Divorciado(a)" },
  { value: "widowed", label: "Viúvo(a)" },
  { value: "separated", label: "Separado(a)" },
] as const;

type Props = {
  initial: ProfileSection;
};

export function PerfilForm({ initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [motherName, setMotherName] = useState(initial.mother_name ?? "");
  const [fatherName, setFatherName] = useState(initial.father_name ?? "");
  const [birthplace, setBirthplace] = useState(initial.birthplace ?? "");
  const [maritalStatus, setMaritalStatus] = useState(initial.marital_status ?? "");
  const [nationality, setNationality] = useState(initial.nationality ?? "");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/me/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mother_name: motherName || null,
            father_name: fatherName || null,
            birthplace: birthplace || null,
            marital_status: maritalStatus || null,
            nationality: nationality || null,
          }),
        });
        const data: { detail?: string } = await res.json();
        if (!res.ok) {
          setError(data.detail ?? "Falha ao salvar.");
          return;
        }
        router.push("/painel");
        router.refresh();
      } catch {
        setError("Falha de rede. Tente de novo.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <ReadOnlyField label="Nome" value={initial.name ?? "—"} />
      <ReadOnlyField
        label="Data de nascimento"
        value={initial.birth_date ?? "—"}
        hint="Vem do CPFHub. Não dá pra editar pelo app."
      />
      <Field label="Nome da mãe" value={motherName} onChange={setMotherName} />
      <Field label="Nome do pai" value={fatherName} onChange={setFatherName} />
      <Field label="Naturalidade (cidade/UF)" value={birthplace} onChange={setBirthplace} />
      <SelectField
        label="Estado civil"
        value={maritalStatus}
        onChange={setMaritalStatus}
        options={MARITAL}
      />
      <Field label="Nacionalidade" value={nationality} onChange={setNationality} />
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

function ReadOnlyField({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm text-muted-on-dark mb-2">{label}</span>
      <div className="rounded-[var(--radius)] bg-char border border-line-light/10 px-4 py-3 text-paper/70">
        {value}
      </div>
      {hint && <p className="text-xs text-muted-on-dark/70 mt-1">{hint}</p>}
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-sm text-muted-on-dark mb-2">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[var(--radius)] bg-char-2 border border-line-light/20 px-4 py-3 text-paper focus-visible:border-gold focus-visible:outline-none"
      />
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T | "";
  onChange: (v: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
}) {
  return (
    <label className="block">
      <span className="block text-sm text-muted-on-dark mb-2">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full rounded-[var(--radius)] bg-char-2 border border-line-light/20 px-4 py-3 text-paper focus-visible:border-gold focus-visible:outline-none"
      >
        {options.map((o) => (
          <option key={o.value || "none"} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
