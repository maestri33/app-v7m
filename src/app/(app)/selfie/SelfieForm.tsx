"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { FileInput } from "@/components/ui/file-input";
import { Spinner } from "@/components/ui/spinner";
import { StatusBanner } from "@/components/ui/status-banner";
import { NEXT_STAGE } from "@/lib/candidate/funnel";
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

  const { data, mutate } = useSWR<SelfieSection>(
    "/api/me/selfie",
    (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json()),
    {
      refreshInterval: (latest) =>
        latest?.taken_at && latest?.analysis_status === "pending" ? POLL_MS : 0,
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
      router.refresh();
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
        const result: { detail?: string } = await res.json();
        if (!res.ok) {
          setError(result.detail ?? "Falha no upload.");
          return;
        }
        await mutate();
      } catch {
        setError("Falha de rede. Tente de novo.");
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

  // Reprovada: identidade não confirmada — quem resolve é o polo, pessoalmente.
  if (takenAt && status === "rejected") {
    return (
      <div className="space-y-4 text-center py-4">
        <h2 className="font-display text-lg">Não confirmamos sua identidade agora</h2>
        <p className="text-sm text-brand-muted">
          Em breve nosso time do polo vai entrar em contato com você pra
          resolver pessoalmente.
        </p>
        {hubWhatsapp && (
          <Button
            href={`https://wa.me/${hubWhatsapp.replace(/\D/g, "")}`}
            variant="ghost"
            className="text-brand-gold-ink border-brand-gold-dark/50"
            target="_blank"
            rel="noopener noreferrer"
          >
            Falar com o polo no WhatsApp
          </Button>
        )}
      </div>
    );
  }

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
          Selfie ao vivo, bem iluminada, sem óculos escuros e sem chapéu. Ela é a
          assinatura eletrônica do seu acordo.
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
          {pending ? "Enviando…" : "Tirar selfie e assinar"}
        </Button>
        <FieldError>{error}</FieldError>
      </div>
    </div>
  );
}
