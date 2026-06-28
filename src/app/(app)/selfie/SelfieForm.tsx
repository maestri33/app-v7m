"use client";

import { useRef, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { FileInput } from "@/components/ui/file-input";
import { StatusBanner } from "@/components/ui/status-banner";
import type { AnalysisStatus } from "@/lib/api/types";

type SelfieSection = {
  taken_at?: string | null;
  analysis_status?: AnalysisStatus;
  analysis_reason?: string | null;
  expires_at?: string | null;
};

const POLL_MS = 2500;

export function SelfieForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const { data, mutate } = useSWR<SelfieSection>(
    "/api/me/selfie",
    (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json()),
    {
      refreshInterval: (latest) =>
        latest?.analysis_status === "pending" ? POLL_MS : 0,
    },
  );

  const status: AnalysisStatus = data?.analysis_status ?? "pending";
  const reason = data?.analysis_reason ?? null;
  const takenAt = data?.taken_at ?? null;

  useEffect(() => {
    if (status === "approved") router.refresh();
  }, [status, router]);

  async function onUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Escolha uma foto primeiro.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const form = new FormData();
        form.append("photo", file, file.name);
        const res = await fetch("/api/me/selfie", {
          method: "POST",
          body: form,
        });
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

  return (
    <div className="space-y-6">
      {takenAt && (
        <StatusBanner
          status={status}
          reason={reason}
          subject="f"
          footnote={`Enviada em ${new Date(takenAt).toLocaleString("pt-BR")}`}
        />
      )}

      <div className="space-y-3">
        <p id="selfie-photo-label" className="text-sm text-brand-muted">
          Selfie ao vivo, bem iluminada, sem óculos/chapéu:
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
          {pending ? "Enviando…" : status === "rejected" ? "Reenviar selfie" : "Enviar selfie"}
        </Button>
        <FieldError>{error}</FieldError>
      </div>
    </div>
  );
}
