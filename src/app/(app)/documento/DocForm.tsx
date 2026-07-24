"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  DocumentCapture,
  type DocumentKind,
  type DocumentSubmission,
  type DocumentSubmitResult,
} from "@/components/documentCapture";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { NEXT_STAGE, wrongStatusHref } from "@/lib/candidate/funnel";
import {
  compressImage,
  FILE_TOO_LARGE_MSG,
  MAX_UPLOAD_BYTES,
} from "@/lib/images/compress";
import type { DocumentSection } from "@/lib/api/types";

type Props = { initial: DocumentSection };

type ClassifyResult = {
  is_document?: boolean | null;
  doc_type?: string | null;
  completeness?: "front" | "back" | "full" | null;
  is_legible?: boolean | null;
  reason?: string | null;
};

export function DocForm({ initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [docType, setDocType] = useState<DocumentKind | null>(
    initial.doc_type === "rg" || initial.doc_type === "cnh" ? initial.doc_type : null,
  );
  const [rgFrontSent, setRgFrontSent] = useState(
    initial.analysis_status !== "rejected" && Boolean(initial.has_front || initial.front_photo),
  );

  function confirmDocument(
    classification: ClassifyResult,
    submission: DocumentSubmission,
  ): boolean {
    if (classification.is_document === false) {
      return false;
    }
    if (classification.is_document !== true) {
      return false;
    }
    if (classification.doc_type && classification.doc_type !== submission.kind) {
      return false;
    }
    if (submission.kind === "rg") {
      const expectedSide = submission.side;
      const detectedSide = classification.completeness;
      if (detectedSide !== expectedSide && detectedSide !== "full") {
        return false;
      }
    }
    if (submission.kind === "cnh" && classification.completeness !== "full") {
      return false;
    }
    if (classification.is_legible !== true) {
      return false;
    }
    return true;
  }

  function documentError(
    classification: ClassifyResult | null,
    submission: DocumentSubmission,
    responseOk: boolean,
  ) {
    if (!responseOk) return "Não conseguimos confirmar o documento agora. Tente enviar novamente.";
    if (classification?.is_document === false) {
      return "Essa imagem não parece ser um documento. Confira a foto e tente novamente.";
    }
    if (classification?.is_document !== true) {
      return "Não foi possível confirmar se o arquivo é um documento. Tente outra foto.";
    }
    if (classification.doc_type && classification.doc_type !== submission.kind) {
      return `A foto parece ser ${classification.doc_type.toUpperCase()}, mas você escolheu ${submission.kind.toUpperCase()}. Corrija o tipo e envie novamente.`;
    }
    if (submission.kind === "rg") {
      const detectedSide = classification.completeness;
      if (detectedSide !== submission.side && detectedSide !== "full") {
        const expectedObject = submission.side === "front" ? "a FRENTE" : "o VERSO";
        const expectedRequest = submission.side === "front" ? "da FRENTE" : "do VERSO";
        const detectedObject =
          detectedSide === "front"
            ? "a FRENTE"
            : detectedSide === "back"
              ? "o VERSO"
              : null;
        return detectedObject
          ? `Essa foto parece ser ${detectedObject} do RG. Agora precisamos ${expectedRequest}.`
          : `Não conseguimos identificar o lado do RG. Envie ${expectedObject} inteiro e legível.`;
      }
    }
    if (submission.kind === "cnh" && classification.completeness !== "full") {
      return "Envie a CNH aberta, mostrando o documento inteiro, ou o PDF da CNH Digital.";
    }
    if (classification.is_legible !== true) {
      return classification.reason ??
        "O documento não está legível o suficiente. Tire outra foto com boa luz e sem cortes.";
    }
    return "Não conseguimos validar esse envio. Tente novamente.";
  }

  function onDocumentSubmit(submission: DocumentSubmission): Promise<DocumentSubmitResult> {
    if (pending) {
      return Promise.resolve({ status: "error", message: "Aguarde o envio atual terminar." });
    }
    const rawFile = submission.file;
    if (!rawFile) {
      return Promise.resolve({ status: "error", message: "Selecione a foto ou PDF para continuar." });
    }
    const uploadFile = rawFile;

    return new Promise((resolve) => {
      startTransition(async () => {
        try {
        setDocType(submission.kind);
        const file = await compressImage(uploadFile);
        if (file.size > MAX_UPLOAD_BYTES) {
          resolve({ status: "error", message: FILE_TOO_LARGE_MSG });
          return;
        }
        const classificationBody = new FormData();
        classificationBody.append("file", file, file.name);
        const classificationResponse = await fetch("/api/me/document/classify", {
          method: "POST",
          body: classificationBody,
        });
        const classification: ClassifyResult | null = classificationResponse.ok
          ? await classificationResponse.json()
          : null;
        if (!classification || !confirmDocument(classification, submission)) {
          resolve({
            status: "error",
            message: documentError(classification, submission, classificationResponse.ok),
          });
          return;
        }

        const slot = submission.kind === "rg" && submission.side === "front"
          ? "rg_front"
          : submission.kind === "rg" && submission.side === "back"
            ? "rg_back"
            : "cnh_full";
        const uploadSlot =
          submission.kind === "rg" && classification?.completeness === "full" ? "rg_full" : slot;

        const body = new FormData();
        body.append("slot", uploadSlot);
        body.append("photo", file, file.name);
        const response = await fetch("/api/me/document/photo", { method: "POST", body });
        const data: { detail?: string; code?: string; expected_status?: string } =
          await response.json();
        if (!response.ok) {
          const redirectTo = wrongStatusHref(data.code, data.expected_status);
          if (redirectTo) {
            router.push(redirectTo);
            resolve({ status: "error", message: "Redirecionando para retomar a etapa correta." });
            return;
          }
          resolve({
            status: "error",
            message: data.detail ?? "Não conseguimos receber essa foto. Tente novamente.",
          });
          return;
        }

        if (uploadSlot === "rg_front") {
          setRgFrontSent(true);
          resolve({ status: "success" });
          return;
        }
        router.push(NEXT_STAGE.documents);
        resolve({ status: "success" });
      } catch {
        resolve({
          status: "error",
          message: "A conexão oscilou. Tente novamente — a etapa pode ser retomada sem recomeçar.",
        });
      }
      });
    });
  }

  return (
    <>
      {pending && <LoadingOverlay label="Recebendo foto…" logo />}
      <DocumentCapture
        initialKind={docType}
        initialRgFrontSent={rgFrontSent}
        onSubmit={onDocumentSubmit}
      />
    </>
  );
}
