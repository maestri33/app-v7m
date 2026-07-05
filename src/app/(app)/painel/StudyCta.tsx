"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { FieldError } from "@/components/ui/field";
import type { StudyStart } from "@/lib/api/types";

// Erros roteados por `code` (envelope {detail, code}) — nunca parseando detail.
function studyErrorMessage(code: string | undefined, detail: string | undefined) {
  switch (code) {
    case "ALREADY_ENROLLED":
    case "ALREADY_STUDENT":
      return "Você já tem uma matrícula em andamento — dá uma olhada no app do aluno.";
    default:
      return detail ?? "Não deu pra iniciar agora. Tente de novo em instantes.";
  }
}

/**
 * CTA da auto-matrícula: cria o checkout e abre o link de pagamento; se só
 * vier QR, mostra o código Pix copia-e-cola aqui mesmo.
 */
export function StudyCta() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<StudyStart["checkout"]>(null);

  function onStart() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/me/promoter/study/start", { method: "POST" });
        const data: StudyStart & { detail?: string; code?: string } = await res.json();
        if (!res.ok) {
          setError(studyErrorMessage(data.code, data.detail));
          return;
        }
        const url = data.checkout?.checkout_url;
        if (url && /^https?:\/\//i.test(url)) {
          window.open(url, "_blank", "noopener,noreferrer");
        }
        setCheckout(data.checkout ?? null);
      } catch {
        setError("A conexão oscilou. Tente de novo — nada foi cobrado.");
      }
    });
  }

  if (checkout) {
    const qrImage = checkout.qrcode_image;
    const qrPayload = checkout.qrcode_payload;
    return (
      <div className="space-y-3" role="status">
        <p className="text-sm font-semibold text-brand-ok">
          Matrícula iniciada ✓ — finalize o pagamento pra garantir sua vaga.
        </p>
        {typeof qrImage === "string" && /^(https?:\/\/|data:image\/)/i.test(qrImage) && (
          // eslint-disable-next-line @next/next/no-img-element -- QR vem do checkout, domínio desconhecido em build
          <img src={qrImage} alt="QR Code do Pix da matrícula" className="h-44 w-44 rounded-[var(--radius-sm)]" />
        )}
        {typeof qrPayload === "string" && qrPayload && (
          <div className="flex flex-wrap items-center gap-2">
            <code className="max-w-full break-all rounded border border-brand-border bg-brand-bg px-2 py-1 text-xs">
              {qrPayload.slice(0, 42)}…
            </code>
            <CopyButton value={qrPayload} label="Copiar código Pix" />
          </div>
        )}
        {checkout.checkout_url && /^https?:\/\//i.test(checkout.checkout_url) && (
          <Button
            href={checkout.checkout_url}
            variant="ghost"
            className="text-brand-gold-ink border-brand-gold-dark/50"
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir página de pagamento ↗
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button type="button" onClick={onStart} loading={pending}>
        {pending ? "Preparando…" : "Quero estudar também"}
      </Button>
      <FieldError>{error}</FieldError>
    </div>
  );
}
