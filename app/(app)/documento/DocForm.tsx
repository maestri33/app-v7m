"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";

import type { AnalysisStatus, DocumentSection } from "@/lib/api/types";

type Props = {
  initial: DocumentSection;
  initialStatus: string;
};

const POLL_MS = 2500;

export function DocForm({ initial, initialStatus }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [docType, setDocType] = useState<string>(initial.doc_type ?? "");
  const [number, setNumber] = useState<string>(initial.number ?? "");
  const [issuing, setIssuing] = useState<string>(initial.issuing_agency ?? "");
  const [extras, setExtras] = useState<Record<string, string>>({});

  // Polling do /me/document enquanto pending.
  const { data: live } = useSWR<DocumentSection>(
    "/api/me/document",
    (url: string) =>
      fetch(url, { cache: "no-store" }).then((r) => r.json()),
    {
      refreshInterval: (latest) =>
        latest?.analysis_status === "pending" ? POLL_MS : 0,
      fallbackData: initial,
    },
  );

  const status: AnalysisStatus = live?.analysis_status ?? initial.analysis_status ?? "pending";
  const missing = live?.missing_fields ?? initial.missing_fields ?? [];

  // Quando o status muda pra approved, refresh do painel.
  useEffect(() => {
    if (status === "approved") router.refresh();
  }, [status, router]);

  function onMeta(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/me/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doc_type: docType,
            number: number,
            issuing_agency: issuing || null,
            issue_date: initial.issue_date ?? null,
            category: initial.category ?? null,
            national_register: initial.national_register ?? null,
            date_of_birth: initial.date_of_birth ?? null,
            expires_on: initial.expires_on ?? null,
          }),
        });
        const data: { detail?: string } = await res.json();
        if (!res.ok) {
          setError(data.detail ?? "Falha ao registrar o documento.");
          return;
        }
        router.refresh();
      } catch {
        setError("Falha de rede. Tente de novo.");
      }
    });
  }

  function onPatch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/me/document", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            number: number || null,
            issuing_agency: issuing || null,
            ...extras,
          }),
        });
        const data: { detail?: string } = await res.json();
        if (!res.ok) {
          setError(data.detail ?? "Falha ao salvar.");
          return;
        }
        router.refresh();
      } catch {
        setError("Falha de rede. Tente de novo.");
      }
    });
  }

  async function onUpload(slot: "rg_full" | "cnh_full") {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Escolha uma foto primeiro.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const form = new FormData();
        form.append("slot", slot);
        form.append("photo", file, file.name);
        const res = await fetch("/api/me/document/photo", {
          method: "POST",
          body: form,
        });
        const data: { detail?: string; analysis_status?: string } = await res.json();
        if (!res.ok) {
          setError(data.detail ?? "Falha no upload.");
          return;
        }
        router.refresh();
      } catch {
        setError("Falha de rede. Tente de novo.");
      }
    });
  }

  // Etapa 1: escolher o tipo (RG ou CNH) e enviar o número.
  if (initialStatus === "DOCUMENTS" && !initial.doc_type) {
    return (
      <form onSubmit={onMeta} className="space-y-5">
        <p className="text-muted-on-dark text-sm">
          Você pode enviar RG ou CNH. O tipo fica travado no primeiro upload.
        </p>
        <fieldset className="space-y-3">
          <legend className="block text-sm text-muted-on-dark mb-2">Tipo</legend>
          {(["rg", "cnh"] as const).map((t) => (
            <label key={t} className="flex items-center gap-3 text-paper">
              <input
                type="radio"
                name="doc_type"
                value={t}
                checked={docType === t}
                onChange={() => setDocType(t)}
                className="accent-gold"
              />
              {t === "rg" ? "RG" : "CNH"}
            </label>
          ))}
        </fieldset>
        <Field
          label="Número"
          value={number}
          onChange={setNumber}
          required
        />
        <Field label="Órgão emissor (SSP, etc.)" value={issuing} onChange={setIssuing} />
        {error && (
          <p className="text-sm text-red-300" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-xl w-full" disabled={pending || !docType}>
          {pending ? "Salvando…" : "Próximo"}
        </button>
      </form>
    );
  }

  // Etapa 2: enviar a foto.
  const slot = initial.doc_type === "cnh" ? "cnh_full" : "rg_full";

  return (
    <div className="space-y-6">
      <StatusBanner status={status} reason={live?.analysis_reason ?? null} />

      <form onSubmit={onPatch} className="space-y-5">
        <Field
          label="Número"
          value={number}
          onChange={setNumber}
          required
        />
        <Field
          label="Órgão emissor"
          value={issuing}
          onChange={setIssuing}
        />
        {/* Campos extras que o OCR não trouxe e o backend marcou como faltando */}
        {missing
          .filter((f) => f !== "doc_type" && f !== "number" && f !== "issuing_agency")
          .map((f) => (
            <Field
              key={f}
              label={humanize(f)}
              value={extras[f] ?? ""}
              onChange={(v) => setExtras((p) => ({ ...p, [f]: v }))}
              required
            />
          ))}
        <button type="submit" className="btn w-full" disabled={pending}>
          {pending ? "Salvando…" : "Salvar dados do documento"}
        </button>
      </form>

      <div className="border-t border-line-light/20 pt-6 space-y-3">
        <p className="text-sm text-muted-on-dark">
          Foto do documento (frente e verso juntos, num PDF ou numa foto só):
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          className="block w-full text-sm text-paper file:mr-3 file:rounded file:border-0 file:bg-gold file:px-4 file:py-2 file:text-char file:font-display"
        />
        <button
          type="button"
          onClick={() => onUpload(slot)}
          className="btn btn-xl w-full"
          disabled={pending}
        >
          {pending ? "Enviando…" : status === "rejected" ? "Reenviar foto" : "Enviar foto"}
        </button>
        {error && (
          <p className="text-sm text-red-300" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function StatusBanner({ status, reason }: { status: AnalysisStatus; reason: string | null }) {
  const tone =
    status === "approved"
      ? "border-green-500/50 bg-green-500/10 text-green-200"
      : status === "rejected"
        ? "border-red-500/50 bg-red-500/10 text-red-200"
        : status === "review"
          ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-200"
          : "border-blue-500/50 bg-blue-500/10 text-blue-200";
  const label =
    status === "approved"
      ? "Aprovado"
      : status === "rejected"
        ? "Reprovado"
        : status === "review"
          ? "Em revisão"
          : "Analisando…";
  return (
    <div className={`rounded-[var(--radius)] border ${tone} p-4`}>
      <p className="font-display">{label}</p>
      {reason && <p className="text-sm mt-1 opacity-90">{reason}</p>}
    </div>
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

function humanize(f: string) {
  return f
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
