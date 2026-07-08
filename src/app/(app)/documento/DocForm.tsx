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

type Side = "front" | "back" | "full";

const POLL_MS = 2500;

// Erros roteados por `code` (envelope {detail, code}) — nunca parseando detail.
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

/**
 * Fluxo invertido: upload PRIMEIRO (foto da câmera OU arquivo), a IA do backend
 * lê e preenche; só o que ela não leu (`missing_fields`) vira input depois.
 * `approved` trava tudo em somente-leitura e segue pro próximo passo.
 *
 * Captura em 2 tempos: FRENTE (`{tipo}_front`) → VERSO (`{tipo}_back`) — o
 * backend monta a seção com `front`+`back` (ou uma única `full` via arquivo/PDF).
 * O passo (front|back) é DERIVADO do backend (`has_front`/`has_back`), não de
 * estado local: sobrevive a refresh e a troca de aba.
 */
export function DocForm({ initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Tipo escolhido localmente antes do 1º upload; depois vem travado do backend.
  const [docType, setDocType] = useState<string>(initial.doc_type ?? "");
  const [extras, setExtras] = useState<Record<string, string>>({});
  // Intervalo de poll sugerido pelo backend no ack do upload (AnalysisAckOut).
  const [pollMs, setPollMs] = useState(POLL_MS);

  // Polling do /me/document enquanto a IA analisa.
  const { data: live, mutate } = useSWR<DocumentSection>(
    "/api/me/document",
    (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json()),
    {
      refreshInterval: (latest) =>
        (latest?.has_full || latest?.doc_type) && latest?.analysis_status === "pending"
          ? pollMs
          : 0,
      fallbackData: initial,
    },
  );

  const doc = live ?? initial;
  const hasFull = Boolean(doc.has_full);
  const hasFront = Boolean(doc.has_front);
  const hasBack = Boolean(doc.has_back);
  // Seção pronta pra IA: uma foto `full` OU frente+verso (espelha o backend).
  const sectionComplete = hasFull || (hasFront && hasBack);
  const lockedType = doc.doc_type ?? null;
  const status: AnalysisStatus | null =
    hasFull || hasFront || hasBack ? (doc.analysis_status ?? "pending") : null;
  const missing = (doc.missing_fields ?? []).filter((f) => f !== "doc_type");
  const isRejected = status === "rejected";
  const effectiveType = lockedType ?? docType;
  // Próximo lado da câmera: só falta o verso quando a frente já entrou.
  const camStep: "front" | "back" =
    !hasFull && hasFront && !hasBack ? "back" : "front";
  // Reabre a captura enquanto a seção não está montada, ou quando reprovou.
  const showCapture = isRejected || !sectionComplete;

  // Aprovado e sem pendência → wizard auto-avançante: direto pro Pix. push()
  // sem refresh(): as páginas são force-dynamic e um refresh concorrente
  // cancela a navegação em andamento.
  useEffect(() => {
    if (status === "approved" && missing.length === 0) {
      router.push(NEXT_STAGE.documents);
    }
  }, [status, missing.length, router]);

  function onUpload(file: File, side: Side) {
    const type = lockedType ?? docType;
    if (!type) return;
    const slot = `${type}_${side}`;
    setError(null);
    startTransition(async () => {
      try {
        const form = new FormData();
        form.append("slot", slot);
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
          if (redir) {
            router.push(redir);
            return;
          }
          setError(uploadErrorMessage(data.code, data.detail));
          return;
        }
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
          // DocumentsIn exige doc_type e number SEMPRE — mesmo quando a IA já
          // leu o número e só falta outro campo.
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
          if (redir) {
            router.push(redir);
            return;
          }
          setError(uploadErrorMessage(data.code, data.detail));
          return;
        }
        router.push(NEXT_STAGE.documents);
      } catch {
        setError("A conexão oscilou. Tente de novo — nada foi perdido.");
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

      {/* Análise da seção completa (frente+verso ou arquivo) — IA lendo ou revisão */}
      {sectionComplete && (status === "pending" || status === "review") && (
        <StatusBanner
          status={status}
          reason={status === "review" ? (doc.analysis_reason ?? null) : null}
          footnote={
            status === "pending"
              ? "IA lendo seu documento…"
              : "Enviado pra revisão — um coordenador vai avaliar."
          }
        />
      )}

      {/* Captura em 2 tempos: frente → verso (ou arquivo/PDF = tudo numa vez) */}
      {showCapture && (
        <div className="rounded-[var(--radius)] border border-dashed border-brand-gold-dark/45 bg-brand-surface p-4 space-y-3">
          {isRejected ? (
            <>
              <p className="text-sm font-semibold">Precisamos refazer o documento</p>
              {doc.analysis_reason && (
                <p className="text-xs text-brand-muted">{doc.analysis_reason}</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <CameraButton
                  onFile={(f) => onUpload(f, "front")}
                  disabled={pending}
                  pending={pending}
                >
                  Refazer frente
                </CameraButton>
                <CameraButton
                  onFile={(f) => onUpload(f, "back")}
                  disabled={pending}
                  pending={pending}
                >
                  Refazer verso
                </CameraButton>
              </div>
              <FileButton onFile={(f) => onUpload(f, "full")} disabled={pending}>
                Ou enviar um arquivo/PDF com tudo
              </FileButton>
            </>
          ) : camStep === "front" ? (
            <>
              <p className="text-sm font-semibold">Frente do documento</p>
              <p className="text-xs text-brand-muted">
                Tire uma foto nítida da <strong>frente</strong>. Depois a gente pede o verso.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <CameraButton
                  onFile={(f) => onUpload(f, "front")}
                  disabled={!effectiveType || pending}
                  pending={pending}
                >
                  Tirar a frente
                </CameraButton>
                <FileButton
                  onFile={(f) => onUpload(f, "full")}
                  disabled={!effectiveType || pending}
                >
                  Enviar arquivo/PDF
                </FileButton>
              </div>
              {!effectiveType ? (
                <p className="field-hint">Escolha RG ou CNH primeiro.</p>
              ) : (
                <p className="text-xs text-brand-muted">
                  Tem um PDF/scan com os dois lados juntos? Use “Enviar arquivo”.
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm font-semibold">Agora o verso</p>
              <p className="text-xs text-brand-muted">
                <span className="font-semibold text-brand-ok">Frente enviada ✓</span> — vire o
                documento e fotografe o <strong>verso</strong>.
              </p>
              <CameraButton
                onFile={(f) => onUpload(f, "back")}
                disabled={pending}
                pending={pending}
              >
                Tirar o verso
              </CameraButton>
            </>
          )}
        </div>
      )}

      {/* Só o que a IA não leu vira input */}
      {sectionComplete &&
        status !== "pending" &&
        status !== "rejected" &&
        missing.length > 0 && (
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

/** Botão de CÂMERA (capture direto) que devolve o File tirado. */
function CameraButton({
  onFile,
  disabled,
  pending,
  children,
}: {
  onFile: (file: File) => void;
  disabled?: boolean;
  pending?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLInputElement>(null);
  function handle() {
    const file = ref.current?.files?.[0];
    if (file) onFile(file);
    if (ref.current) ref.current.value = "";
  }
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handle}
      />
      <Button
        type="button"
        loading={pending}
        disabled={disabled}
        onClick={() => ref.current?.click()}
        className="px-3 whitespace-nowrap"
      >
        <Camera size={18} aria-hidden /> {children}
      </Button>
    </>
  );
}

/** Botão de ARQUIVO (imagem OU PDF) que devolve o File escolhido. */
function FileButton({
  onFile,
  disabled,
  children,
}: {
  onFile: (file: File) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLInputElement>(null);
  function handle() {
    const file = ref.current?.files?.[0];
    if (file) onFile(file);
    if (ref.current) ref.current.value = "";
  }
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handle}
      />
      <Button
        type="button"
        variant="ghost"
        disabled={disabled}
        onClick={() => ref.current?.click()}
        className="w-full px-3 whitespace-nowrap text-brand-ink border-brand-border"
      >
        <FileUp size={18} aria-hidden /> {children}
      </Button>
    </>
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
        <div className="grid grid-cols-2 gap-3">
          <CameraButton onFile={onFile} disabled={pending} pending={pending}>
            Tirar foto
          </CameraButton>
          <FileButton onFile={onFile} disabled={pending}>
            Enviar arquivo
          </FileButton>
        </div>
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
