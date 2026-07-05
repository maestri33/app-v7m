"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";

import { Button } from "@/components/ui/button";
import { Field, FieldError, ReadOnlyField } from "@/components/ui/field";
import { StatusBanner } from "@/components/ui/status-banner";
import { NEXT_STAGE } from "@/lib/candidate/funnel";
import type { AnalysisStatus, DocumentSection } from "@/lib/api/types";

type Props = {
  initial: DocumentSection;
};

const POLL_MS = 2500;

// Erros roteados por `code` (envelope {detail, code}) — nunca parseando detail.
function uploadErrorMessage(code: string | undefined, detail: string | undefined) {
  switch (code) {
    case "IMAGE_TYPE_INVALID":
      return "Formato não aceito — envie JPEG, PNG, WEBP ou PDF.";
    case "IMAGE_TOO_LARGE":
      return "Arquivo grande demais. Tente uma foto mais leve.";
    default:
      return detail ?? "Falha no upload. Tente de novo.";
  }
}

/**
 * Fluxo invertido: upload PRIMEIRO (foto da câmera OU arquivo), a IA do backend
 * lê e preenche; só o que ela não leu (`missing_fields`) vira input depois.
 * `approved` trava tudo em somente-leitura e segue pro próximo passo.
 */
export function DocForm({ initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Tipo escolhido localmente antes do 1º upload; depois vem travado do backend.
  const [docType, setDocType] = useState<string>(initial.doc_type ?? "");
  const [extras, setExtras] = useState<Record<string, string>>({});

  // Polling do /me/document enquanto a IA analisa.
  const { data: live, mutate } = useSWR<DocumentSection>(
    "/api/me/document",
    (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json()),
    {
      refreshInterval: (latest) =>
        (latest?.has_full || latest?.doc_type) && latest?.analysis_status === "pending"
          ? POLL_MS
          : 0,
      fallbackData: initial,
    },
  );

  const doc = live ?? initial;
  const uploaded = Boolean(doc.has_full || doc.has_front || doc.has_back);
  const lockedType = doc.doc_type ?? null;
  const status: AnalysisStatus | null = uploaded
    ? (doc.analysis_status ?? "pending")
    : null;
  const missing = (doc.missing_fields ?? []).filter((f) => f !== "doc_type");

  // Aprovado e sem pendência → wizard auto-avançante: direto pro Pix. push()
  // sem refresh(): as páginas são force-dynamic e um refresh concorrente
  // cancela a navegação em andamento.
  useEffect(() => {
    if (status === "approved" && missing.length === 0) {
      router.push(NEXT_STAGE.documents);
    }
  }, [status, missing.length, router]);

  function onUpload(file: File) {
    const slot = (lockedType ?? docType) === "cnh" ? "cnh_full" : "rg_full";
    setError(null);
    startTransition(async () => {
      try {
        const form = new FormData();
        form.append("slot", slot);
        form.append("photo", file, file.name);
        const res = await fetch("/api/me/document/photo", { method: "POST", body: form });
        const data: { detail?: string; code?: string } = await res.json();
        if (!res.ok) {
          setError(uploadErrorMessage(data.code, data.detail));
          return;
        }
        await mutate();
        router.refresh();
      } catch {
        setError("Falha de rede. Tente de novo.");
      }
    });
  }

  function onMissingSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/me/document", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(extras),
        });
        const data: { detail?: string; code?: string } = await res.json();
        if (!res.ok) {
          setError(uploadErrorMessage(data.code, data.detail));
          return;
        }
        router.push(NEXT_STAGE.documents);
      } catch {
        setError("Falha de rede. Tente de novo.");
      }
    });
  }

  // ── Aprovado: tudo somente-leitura, sem reenvio ────────────────────────────
  if (status === "approved" && missing.length === 0) {
    return (
      <div className="space-y-5">
        <StatusBanner
          status="approved"
          footnote="Documento lido e confirmado. Etapa concluída — não precisa reenviar."
        />
        <ReadOnlyField label="Tipo" value={(lockedType ?? "").toUpperCase() || "—"} />
        {doc.number && <ReadOnlyField label="Número" value={String(doc.number)} />}
        {doc.issuing_agency && (
          <ReadOnlyField label="Órgão emissor" value={String(doc.issuing_agency)} />
        )}
        <Button href={NEXT_STAGE.documents} size="xl" className="w-full">
          Continuar
        </Button>
      </div>
    );
  }

  const effectiveType = lockedType ?? docType;

  return (
    <div className="space-y-6">
      {/* Tipo: RG ou CNH — trava depois do 1º upload */}
      <fieldset className="space-y-2">
        <legend className="label">Tipo</legend>
        <div className="grid grid-cols-2 gap-3">
          {(["rg", "cnh"] as const).map((t) => (
            <label
              key={t}
              className={`flex items-center justify-center gap-2 rounded-[var(--radius-sm)] border px-4 py-3 transition-colors ${
                effectiveType === t
                  ? "border-brand-gold bg-brand-gold-light/10"
                  : "border-brand-border bg-brand-surface"
              } ${lockedType ? "opacity-70" : "cursor-pointer hover:border-brand-gold-dark"}`}
            >
              <input
                type="radio"
                name="doc_type"
                value={t}
                checked={effectiveType === t}
                disabled={Boolean(lockedType)}
                onChange={() => setDocType(t)}
                className="accent-gold-deep"
              />
              {t === "rg" ? "RG" : "CNH"}
            </label>
          ))}
        </div>
        <p className="field-hint">
          {lockedType
            ? "🔒 tipo não pode ser trocado depois de enviado"
            : "O tipo fica travado no primeiro upload."}
        </p>
      </fieldset>

      {status && (
        <StatusBanner
          status={status}
          reason={status === "rejected" ? (doc.analysis_reason ?? null) : null}
          footnote={status === "pending" ? "IA lendo seu documento…" : null}
        />
      )}

      {/* Upload (some quando a análise passou; reabre no rejected) */}
      {(!uploaded || status === "rejected") && (
        <div className="rounded-[var(--radius)] border border-dashed border-brand-gold-dark/45 bg-brand-surface p-4 space-y-3">
          <p className="text-sm font-semibold">Documento (frente e verso juntos)</p>
          <p className="text-xs text-brand-muted">
            uma foto só, ou um arquivo — imagem ou PDF
          </p>
          <UploadActions
            disabled={!effectiveType || pending}
            pending={pending}
            retry={status === "rejected"}
            onFile={onUpload}
          />
          {!effectiveType && (
            <p className="field-hint">Escolha RG ou CNH primeiro.</p>
          )}
        </div>
      )}

      {/* Só o que a IA não leu vira input */}
      {uploaded && status !== "pending" && status !== "rejected" && missing.length > 0 && (
        <form onSubmit={onMissingSubmit} className="space-y-5">
          <p className="text-sm text-brand-muted">
            A IA não conseguiu ler {missing.length === 1 ? "este campo" : "estes campos"} —
            complete pra seguir:
          </p>
          {missing.map((f) => (
            <Field
              key={f}
              label={fieldLabel(f)}
              value={extras[f] ?? ""}
              onChange={(v) => setExtras((p) => ({ ...p, [f]: v }))}
              required
            />
          ))}
          <Button type="submit" size="xl" loading={pending} className="w-full">
            {pending ? "Salvando…" : "Confirmar e continuar"}
          </Button>
        </form>
      )}

      <FieldError>{error}</FieldError>

      <AddressProofCard />
    </div>
  );
}

/** Duas ações alimentando o MESMO upload: câmera (capture) ou arquivo (img/PDF). */
function UploadActions({
  onFile,
  disabled,
  pending,
  retry,
}: {
  onFile: (file: File) => void;
  disabled?: boolean;
  pending?: boolean;
  retry?: boolean;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handle(input: HTMLInputElement | null) {
    const file = input?.files?.[0];
    if (file) onFile(file);
    if (input) input.value = "";
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={() => handle(cameraRef.current)}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={() => handle(fileRef.current)}
      />
      <Button
        type="button"
        loading={pending}
        disabled={disabled}
        onClick={() => cameraRef.current?.click()}
      >
        📷 {retry ? "Tirar outra foto" : "Tirar foto"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        disabled={disabled}
        onClick={() => fileRef.current?.click()}
        className="text-brand-ink border-brand-border"
      >
        📄 Enviar arquivo
      </Button>
    </div>
  );
}

/** Comprovante de residência — opcional, não bloqueia o avanço. */
function AddressProofCard() {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onFile(file: File) {
    setError(null);
    startTransition(async () => {
      try {
        const form = new FormData();
        form.append("file", file, file.name);
        const res = await fetch("/api/me/document/address-proof", {
          method: "POST",
          body: form,
        });
        const data: { detail?: string; code?: string } = await res.json();
        if (!res.ok) {
          setError(uploadErrorMessage(data.code, data.detail));
          return;
        }
        setDone(true);
      } catch {
        setError("Falha de rede. Tente de novo.");
      }
    });
  }

  return (
    <div className="rounded-[var(--radius)] border border-dashed border-brand-border bg-brand-surface p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Comprovante de residência</p>
          <p className="text-xs text-brand-muted">
            opcional — agiliza sua análise, pode enviar depois
          </p>
        </div>
        {done && <span className="text-sm font-semibold text-brand-ok">enviado ✓</span>}
      </div>
      {!done && (
        <UploadActions onFile={onFile} disabled={pending} pending={pending} />
      )}
      <FieldError>{error}</FieldError>
    </div>
  );
}

// Rótulos pt-BR dos campos que o backend pode marcar como faltando (regra do
// CLAUDE.md: texto voltado a humano em pt-BR). Fallback humaniza a chave crua
// para qualquer campo novo que o backend venha a exigir.
const FIELD_LABELS: Record<string, string> = {
  number: "Número",
  issuing_agency: "Órgão emissor (SSP, etc.)",
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
