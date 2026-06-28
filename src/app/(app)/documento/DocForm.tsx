"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";

import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { FileInput } from "@/components/ui/file-input";
import { StatusBanner } from "@/components/ui/status-banner";
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
    (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json()),
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
  if (initialStatus === "documents" && !initial.doc_type) {
    return (
      <form onSubmit={onMeta} className="space-y-5">
        <p className="text-brand-muted text-sm">
          Você pode enviar RG ou CNH. O tipo fica travado no primeiro upload.
        </p>
        <fieldset className="space-y-2">
          <legend className="label">Tipo</legend>
          {(["rg", "cnh"] as const).map((t) => (
            <label
              key={t}
              className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-brand-border bg-brand-surface px-4 py-3 cursor-pointer hover:border-brand-gold-dark has-[:checked]:border-brand-gold has-[:checked]:bg-brand-gold-light/10 transition-colors"
            >
              <input
                type="radio"
                name="doc_type"
                value={t}
                checked={docType === t}
                onChange={() => setDocType(t)}
                className="accent-gold-deep"
              />
              {t === "rg" ? "RG" : "CNH"}
            </label>
          ))}
        </fieldset>
        <Field label="Número" value={number} onChange={setNumber} required />
        <Field label="Órgão emissor (SSP, etc.)" value={issuing} onChange={setIssuing} />
        <FieldError>{error}</FieldError>
        <Button type="submit" size="xl" loading={pending} disabled={!docType} className="w-full">
          {pending ? "Salvando…" : "Próximo"}
        </Button>
      </form>
    );
  }

  // Etapa 2: enviar a foto.
  const slot = initial.doc_type === "cnh" ? "cnh_full" : "rg_full";

  return (
    <div className="space-y-6">
      <StatusBanner status={status} reason={live?.analysis_reason ?? null} />

      <form onSubmit={onPatch} className="space-y-5">
        <Field label="Número" value={number} onChange={setNumber} required />
        <Field label="Órgão emissor" value={issuing} onChange={setIssuing} />
        {/* Campos extras que o OCR não trouxe e o backend marcou como faltando */}
        {missing
          .filter((f) => f !== "doc_type" && f !== "number" && f !== "issuing_agency")
          .map((f) => (
            <Field
              key={f}
              label={fieldLabel(f)}
              value={extras[f] ?? ""}
              onChange={(v) => setExtras((p) => ({ ...p, [f]: v }))}
              required
            />
          ))}
        <Button type="submit" loading={pending} className="w-full">
          {pending ? "Salvando…" : "Salvar dados do documento"}
        </Button>
      </form>

      <div className="border-t border-brand-border pt-6 space-y-3">
        <p id="doc-photo-label" className="text-sm text-brand-muted">
          Foto do documento (frente e verso juntos, num PDF ou numa foto só):
        </p>
        <FileInput
          ref={fileRef}
          accept="image/*,application/pdf"
          aria-labelledby="doc-photo-label"
        />
        <Button
          type="button"
          size="xl"
          onClick={() => onUpload(slot)}
          loading={pending}
          className="w-full"
        >
          {pending ? "Enviando…" : status === "rejected" ? "Reenviar foto" : "Enviar foto"}
        </Button>
        <FieldError>{error}</FieldError>
      </div>
    </div>
  );
}

// Rótulos pt-BR dos campos que o backend pode marcar como faltando (regra do
// CLAUDE.md: texto voltado a humano em pt-BR). Fallback humaniza a chave crua
// para qualquer campo novo que o backend venha a exigir.
const FIELD_LABELS: Record<string, string> = {
  issue_date: "Data de emissão",
  category: "Categoria (CNH)",
  national_register: "Registro nacional (CNH)",
  date_of_birth: "Data de nascimento",
  expires_on: "Validade",
};

function fieldLabel(f: string) {
  return (
    FIELD_LABELS[f] ?? f.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}
