"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, FileUp } from "lucide-react";
import useSWR from "swr";

import { Button } from "@/components/ui/button";
import { Field, FieldError, ReadOnlyField } from "@/components/ui/field";
import { StatusBanner } from "@/components/ui/status-banner";
import { NEXT_STAGE, wrongStatusHref } from "@/lib/candidate/funnel";
import type { AnalysisStatus, DocumentSection } from "@/lib/api/types";

type Props = {
  initial: DocumentSection;
};

const POLL_MS = 2500;

function uploadErrorMessage(code: string | undefined, detail: string | undefined) {
  switch (code) {
    case "IMAGE_TYPE_INVALID":
      return "Esse formato a gente ainda não lê — envie uma foto (JPEG, PNG, WEBP) ou um PDF.";
    case "IMAGE_TOO_LARGE":
      return "O arquivo ficou pesado demais. Uma foto mais leve resolve.";
    default:
      return detail ?? "Não conseguimos receber o arquivo agora. Tente de novo.";
  }
}

/** Rótulo amigável por slot. */
const SLOT_LABEL: Record<string, string> = {
  rg_front: "Envie a FRENTE do seu RG",
  rg_back: "Frente aprovada! Envie o VERSO",
  cnh_full: "Envie sua CNH (frente e verso)",
};

/**
 * Fluxo slot-a-slot: o backend diz qual foto precisa (`next_slot`), o form
 * mostra 1 slot por vez. Após upload, poll até `analysis_status` sair de
 * pending. Cada foto individual tem status em `photos`.
 */
export function DocForm({ initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [docType, setDocType] = useState<string>(initial.doc_type ?? "");
  const [extras, setExtras] = useState<Record<string, string>>({});
  const [pollMs, setPollMs] = useState(POLL_MS);
  const [justUploaded, setJustUploaded] = useState(false);
  // Aviso suave da classificação por IA (o promotor ACEITA os dois; a IA só orienta se divergir).
  const [classifyHint, setClassifyHint] = useState<string | null>(null);

  const { data: live, mutate } = useSWR<DocumentSection>(
    "/api/me/document",
    (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json()),
    {
      refreshInterval: (latest) =>
        (justUploaded || latest?.analysis_status === "pending") ? pollMs : 0,
      fallbackData: initial,
    },
  );

  const doc = live ?? initial;
  const lockedType = doc.doc_type ?? null;
  const nextSlot = doc.next_slot ?? null;
  const status: AnalysisStatus | null = doc.analysis_status ?? null;
  const missing = (doc.missing_fields ?? []).filter((f) => f !== "doc_type");
  const hasSlot = nextSlot != null;
  const isAnalyzing = justUploaded || (hasSlot && status === "pending");

  // Aprovado, sem slot pendente, sem campo faltando → auto-avança.
  useEffect(() => {
    if (status === "approved" && !hasSlot && missing.length === 0) {
      router.push(NEXT_STAGE.documents);
    }
  }, [status, hasSlot, missing.length, router]);

  // Classifica a foto (IA→OmniRoute) ANTES de enviar e, se o tipo reconhecido divergir do escolhido,
  // orienta suavemente (não bloqueia — o promotor aceita RG e CNH). Fail-open: erro → sem aviso.
  async function classifyHintFor(file: File, chosen: string) {
    setClassifyHint(null);
    try {
      const form = new FormData();
      form.append("file", file, file.name);
      const res = await fetch("/api/me/document/classify", { method: "POST", body: form });
      const c: { is_document?: boolean | null; doc_type?: string | null } = await res.json();
      if (c.is_document === false) {
        setClassifyHint("Não reconhecemos um documento nessa foto — confira antes de enviar.");
      } else if (c.doc_type && chosen && c.doc_type !== chosen) {
        setClassifyHint(
          `Você escolheu ${chosen.toUpperCase()}, mas a foto parece ${c.doc_type.toUpperCase()}. Confira se está certo.`,
        );
      }
    } catch {
      // fail-open: sem aviso
    }
  }

  function onUpload(file: File) {
    if (!nextSlot) return;
    setError(null);
    void classifyHintFor(file, lockedType ?? docType);
    startTransition(async () => {
      try {
        const form = new FormData();
        form.append("slot", nextSlot);
        form.append("photo", file, file.name);
        const res = await fetch("/api/me/document/photo", { method: "POST", body: form });
        const data: {
          detail?: string;
          code?: string;
          expected_status?: string;
          poll_after_ms?: number;
        } = await res.json();
        if (res.ok && typeof data.poll_after_ms === "number" && data.poll_after_ms > 0) {
          setPollMs(data.poll_after_ms);
        }
        if (!res.ok) {
          const redir = wrongStatusHref(data.code, data.expected_status);
          if (redir) { router.push(redir); return; }
          setError(uploadErrorMessage(data.code, data.detail));
          return;
        }
        setJustUploaded(true);
        await mutate();
        router.refresh();
      } catch {
        setError("A conexão oscilou. Tente de novo — nada foi perdido.");
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
          body: JSON.stringify({
            doc_type: lockedType ?? docType,
            number: extras.number ?? doc.number ?? "",
            ...extras,
          }),
        });
        const data: { detail?: string; code?: string; expected_status?: string } =
          await res.json();
        if (!res.ok) {
          const redir = wrongStatusHref(data.code, data.expected_status);
          if (redir) { router.push(redir); return; }
          setError(uploadErrorMessage(data.code, data.detail));
          return;
        }
        router.push(NEXT_STAGE.documents);
      } catch {
        setError("A conexão oscilou. Tente de novo — nada foi perdido.");
      }
    });
  }

  // ── Aprovado: tudo somente-leitura ──────────────────────────────────────────
  if (status === "approved" && !hasSlot && missing.length === 0) {
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
  const slotLabel = nextSlot ? SLOT_LABEL[nextSlot] : null;

  return (
    <div className="space-y-6">
      {/* Tipo: RG ou CNH — trava depois do 1º upload */}
      {!lockedType && (
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
                } cursor-pointer hover:border-brand-gold-dark`}
              >
                <input
                  type="radio"
                  name="doc_type"
                  value={t}
                  checked={effectiveType === t}
                  onChange={() => setDocType(t)}
                  className="accent-gold-deep"
                />
                {t === "rg" ? "RG" : "CNH"}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* Banner de status quando analisando ou em revisão */}
      {status && status !== "approved" && (
        <StatusBanner
          status={status}
          reason={status === "rejected" ? (doc.analysis_reason ?? null) : null}
          footnote={status === "pending" ? "IA lendo seu documento…" : null}
        />
      )}

      {/* Upload: 1 slot por vez, some durante análise */}
      {hasSlot && !isAnalyzing && status !== "rejected" && (
        <div className="rounded-[var(--radius)] border border-dashed border-brand-gold-dark/45 bg-brand-surface p-4 space-y-3">
          <p className="text-sm font-semibold">
            {slotLabel ?? `Envie: ${nextSlot}`}
          </p>
          <p className="text-xs text-brand-muted">
            tire uma foto ou envie um arquivo — imagem ou PDF
          </p>
          <UploadActions
            disabled={!effectiveType || pending}
            pending={pending}
            onFile={onUpload}
          />
          {!effectiveType && (
            <p className="field-hint">Escolha RG ou CNH primeiro.</p>
          )}
          {classifyHint && (
            <p className="text-xs font-semibold text-brand-gold-dark">{classifyHint}</p>
          )}
        </div>
      )}

      {/* Rejected: re-abre upload pro mesmo slot */}
      {hasSlot && status === "rejected" && (
        <div className="rounded-[var(--radius)] border border-dashed border-brand-gold-dark/45 bg-brand-surface p-4 space-y-3">
          <p className="text-sm font-semibold">
            {slotLabel ?? `Envie: ${nextSlot}`}
          </p>
          <UploadActions
            disabled={!effectiveType || pending}
            pending={pending}
            retry
            onFile={onUpload}
          />
        </div>
      )}

      {/* Review: aguardando revisão humana */}
      {status === "review" && !hasSlot && (
        <div className="banner banner-warn" role="status">
          <p className="font-display">Documento em revisão</p>
          <p className="text-xs mt-1 opacity-70">
            Nossa equipe está analisando. Você receberá uma notificação quando
            estiver pronto.
          </p>
        </div>
      )}

      {/* Campos que a IA não leu → input manual */}
      {!isAnalyzing && status !== "rejected" && missing.length > 0 && (
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
        className="px-3 whitespace-nowrap"
      >
        <Camera size={18} aria-hidden /> {retry ? "Tirar de novo" : "Tirar foto"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        disabled={disabled}
        onClick={() => fileRef.current?.click()}
        className="px-3 whitespace-nowrap text-brand-ink border-brand-border"
      >
        <FileUp size={18} aria-hidden /> Enviar arquivo
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
        setError("A conexão oscilou. Tente de novo — nada foi perdido.");
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
