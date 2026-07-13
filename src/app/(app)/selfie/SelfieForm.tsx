"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { FileInput } from "@/components/ui/file-input";
import { Spinner } from "@/components/ui/spinner";
import { StatusBanner } from "@/components/ui/status-banner";
import { NEXT_STAGE, wrongStatusHref } from "@/lib/candidate/funnel";
import type { AnalysisStatus } from "@/lib/api/types";

import { AgreementSheet } from "./AgreementSheet";

type SelfieSection = {
  taken_at?: string | null;
  analysis_status?: AnalysisStatus;
  analysis_reason?: string | null;
  expires_at?: string | null;
  /** Contato do polo, quando o backend informar — usado no rejected. */
  hub_whatsapp?: string | null;
};

const POLL_MS = 2500;

export function SelfieForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Aceite do acordo é client-side; a assinatura de verdade é a selfie (o
  // backend guarda foto + data/hora/dispositivo).
  const [accepted, setAccepted] = useState(false);
  // Intervalo de poll sugerido pelo backend no ack do upload (AnalysisAckOut).
  const [pollMs, setPollMs] = useState(POLL_MS);

  const { data, mutate } = useSWR<SelfieSection>(
    "/api/me/selfie",
    (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json()),
    {
      refreshInterval: (latest) =>
        latest?.taken_at && latest?.analysis_status === "pending" ? pollMs : 0,
    },
  );

  const takenAt = data?.taken_at ?? null;
  const status: AnalysisStatus = data?.analysis_status ?? "pending";
  const hubWhatsapp = data?.hub_whatsapp ?? null;

  // Aprovada → wizard auto-avançante: direto pro painel (visão "aguardando
  // aprovação do polo").
  useEffect(() => {
    if (takenAt && status === "approved") {
      router.push(NEXT_STAGE.selfie);
    }
  }, [takenAt, status, router]);

  async function onUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Tire a selfie primeiro.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const form = new FormData();
        form.append("photo", file, file.name);
        const res = await fetch("/api/me/selfie", { method: "POST", body: form });
        const result: {
          detail?: string;
          code?: string;
          expected_status?: string;
          poll_after_ms?: number;
        } = await res.json();
        if (res.ok && typeof result.poll_after_ms === "number" && result.poll_after_ms > 0) {
          setPollMs(result.poll_after_ms);
        }
        if (!res.ok) {
          const redir = wrongStatusHref(result.code, result.expected_status);
          if (redir) {
            router.push(redir);
            return;
          }
          setError(result.detail ?? "Não conseguimos receber sua selfie agora. Tente de novo.");
          return;
        }
        await mutate();
      } catch {
        setError("A conexão oscilou. Tente de novo — nada foi perdido.");
      }
    });
  }

  // Esperando a 1ª resposta do backend — sem decidir modal antes da hora.
  if (!data) {
    return (
      <p className="flex items-center gap-2 text-sm text-brand-muted" role="status">
        <Spinner /> Carregando…
      </p>
    );
  }

  // Antes da 1ª selfie: acordo com header/rodapé fixos e texto rolável.
  if (!takenAt && !accepted) {
    return (
      <>
        <p className="text-sm text-brand-muted">
          Antes de tirar a selfie, leia e aceite o acordo de parceria.
        </p>
        <AgreementSheet onAccept={() => setAccepted(true)} />
      </>
    );
  }

  // Reprovada: NÃO é beco sem saída — o backend gera instruções práticas em
  // `analysis_reason` ("Como resolver: …") e aceita novas tentativas (na 5ª
  // reprovação ele mesmo promove com ressalva de encontro presencial — escape
  // que só dispara com re-uploads). Cai no form principal: o StatusBanner
  // mostra o motivo e o uploader deixa refazer na hora; o polo vira caminho
  // alternativo, não o único.

  // Análise manual: nada a fazer aqui, aviso chega por WhatsApp.
  if (takenAt && status === "review") {
    return (
      <div className="space-y-3 text-center py-4">
        <h2 className="font-display text-lg">Selfie em análise manual</h2>
        <p className="text-sm text-brand-muted">
          Avisamos por WhatsApp assim que confirmarmos — não devia demorar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {takenAt && (
        <StatusBanner
          status={status}
          reason={data.analysis_reason ?? null}
          subject="f"
          footnote={`Enviada em ${new Date(takenAt).toLocaleString("pt-BR")}`}
        />
      )}

      <div className="space-y-3">
        <p id="selfie-photo-label" className="text-sm text-brand-muted">
          {status === "rejected"
            ? "Siga as dicas acima e tire outra selfie — dá pra resolver agora, sem esperar ninguém."
            : "Selfie ao vivo, bem iluminada, sem óculos escuros e sem chapéu. Ela é a assinatura eletrônica do seu acordo."}
        </p>
        <FileInput
          ref={fileRef}
          accept="image/*"
          capture="user"
          aria-labelledby="selfie-photo-label"
        />
        <Button
          type="button"
          size="xl"
          onClick={onUpload}
          loading={pending}
          className="w-full"
        >
          {pending
            ? "Enviando…"
            : status === "rejected"
              ? "Tirar outra selfie e assinar"
              : "Tirar selfie e assinar"}
        </Button>
        <FieldError>{error}</FieldError>
        {status === "rejected" && hubWhatsapp && (
          <Button
            href={`https://wa.me/${hubWhatsapp.replace(/\D/g, "")}`}
            variant="ghost"
            className="w-full text-brand-gold-ink border-brand-gold-dark/50"
            target="_blank"
            rel="noopener noreferrer"
          >
            Prefiro falar com o polo no WhatsApp
          </Button>
        )}
      </div>
    </div>
  );
}
