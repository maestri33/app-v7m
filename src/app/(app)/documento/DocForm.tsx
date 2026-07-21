"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { FieldError } from "@/components/ui/field";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { UploadActions } from "@/components/ui/upload-actions";
import { NEXT_STAGE, wrongStatusHref } from "@/lib/candidate/funnel";
import {
  compressImage,
  FILE_TOO_LARGE_MSG,
  MAX_UPLOAD_BYTES,
} from "@/lib/images/compress";
import type { DocumentSection } from "@/lib/api/types";

type Props = { initial: DocumentSection };
type DocType = "rg" | "cnh";

type ClassifyResult = {
  is_document?: boolean | null;
  doc_type?: string | null;
};

export function DocForm({ initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [docType, setDocType] = useState<DocType | null>(
    initial.doc_type === "rg" || initial.doc_type === "cnh" ? initial.doc_type : null,
  );
  const [rgFrontSent, setRgFrontSent] = useState(
    initial.analysis_status !== "rejected" && Boolean(initial.has_front || initial.front_photo),
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const slot = docType === "rg" ? (rgFrontSent ? "rg_back" : "rg_front") : "cnh_full";
  const prompt =
    docType === "rg"
      ? rgFrontSent
        ? "Agora envie o VERSO do RG"
        : "Primeiro envie a FRENTE do RG"
      : "Envie a CNH aberta ou um PDF da CNH Digital";

  async function confirmDocument(file: File): Promise<boolean> {
    const body = new FormData();
    body.append("file", file, file.name);
    const response = await fetch("/api/me/document/classify", { method: "POST", body });
    if (!response.ok) return true;
    const classification: ClassifyResult = await response.json();
    if (classification.is_document === false) {
      setError("Essa imagem não parece ser um documento. Confira a foto e tente novamente.");
      return false;
    }
    if (classification.doc_type && classification.doc_type !== docType) {
      setError(
        `A foto parece ser ${classification.doc_type.toUpperCase()}, mas você escolheu ${docType?.toUpperCase()}. Corrija o tipo e envie novamente.`,
      );
      return false;
    }
    return true;
  }

  function onUpload(rawFile: File) {
    if (!docType || pending) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        const file = await compressImage(rawFile);
        if (file.size > MAX_UPLOAD_BYTES) {
          setError(FILE_TOO_LARGE_MSG);
          return;
        }
        if (!(await confirmDocument(file))) return;

        const body = new FormData();
        body.append("slot", slot);
        body.append("photo", file, file.name);
        const response = await fetch("/api/me/document/photo", { method: "POST", body });
        const data: { detail?: string; code?: string; expected_status?: string } =
          await response.json();
        if (!response.ok) {
          const redirectTo = wrongStatusHref(data.code, data.expected_status);
          if (redirectTo) {
            router.push(redirectTo);
            return;
          }
          setError(data.detail ?? "Não conseguimos receber essa foto. Tente novamente.");
          return;
        }

        if (docType === "rg" && !rgFrontSent) {
          setRgFrontSent(true);
          setNotice("Frente recebida. A leitura continua em segundo plano.");
          return;
        }
        router.push(NEXT_STAGE.documents);
      } catch {
        setError("A conexão oscilou. Tente novamente — a etapa pode ser retomada sem recomeçar.");
      }
    });
  }

  return (
    <div className="space-y-5">
      {pending && <LoadingOverlay label="Recebendo foto…" logo />}
      <fieldset className="space-y-2" disabled={pending || rgFrontSent}>
        <legend className="label">Qual documento você vai usar?</legend>
        <div className="grid grid-cols-2 gap-3">
          {(["rg", "cnh"] as const).map((type) => (
            <label
              key={type}
              className={`flex cursor-pointer items-center justify-center rounded-[var(--radius-sm)] border px-4 py-3 ${
                docType === type
                  ? "border-brand-gold bg-brand-gold-light/10"
                  : "border-[var(--surface-border)] bg-[var(--surface)]"
              }`}
            >
              <input
                className="accent-gold-deep mr-2"
                type="radio"
                name="doc_type"
                value={type}
                checked={docType === type}
                onChange={() => {
                  setDocType(type);
                  setError(null);
                }}
              />
              {type.toUpperCase()}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="rounded-[var(--radius)] border border-dashed border-brand-gold-dark/45 bg-[var(--surface)] p-4 space-y-3">
        <p className="font-semibold">{docType ? prompt : "Escolha RG ou CNH para continuar"}</p>
        <p className="text-xs text-[var(--surface-text-muted)]">
          A foto só precisa mostrar o documento inteiro e legível. A conferência detalhada não prende você nesta tela.
        </p>
        <UploadActions
          disabled={!docType || pending}
          pending={pending}
          onFile={onUpload}
        />
      </div>

      {notice && <div className="banner banner-ok" role="status">{notice}</div>}
      <FieldError>{error}</FieldError>
    </div>
  );
}
