"use client";

import { useRef, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";

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
    (url: string) =>
      fetch(url, { cache: "no-store" }).then((r) => r.json()),
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
      {takenAt && <StatusBanner status={status} reason={reason} takenAt={takenAt} />}

      <div className="space-y-3">
        <p className="text-sm text-muted-on-dark">
          Selfie ao vivo, bem iluminada, sem óculos/chapéu:
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="user"
          className="block w-full text-sm text-paper file:mr-3 file:rounded file:border-0 file:bg-gold file:px-4 file:py-2 file:text-char file:font-display"
        />
        <button
          type="button"
          onClick={onUpload}
          className="btn btn-xl w-full"
          disabled={pending}
        >
          {pending ? "Enviando…" : status === "rejected" ? "Reenviar selfie" : "Enviar selfie"}
        </button>
        {error && (
          <p className="text-sm text-red-300" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function StatusBanner({
  status,
  reason,
  takenAt,
}: {
  status: AnalysisStatus;
  reason: string | null;
  takenAt: string;
}) {
  const tone =
    status === "approved"
      ? "border-green-500/50 bg-green-500/10 text-green-200"
      : status === "rejected"
        ? "border-red-500/50 bg-red-500/10 text-red-200"
        : status === "review"
          ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-200"
          : "border-blue-500/50 bg-blue-500/10 text-blue-200";
  const label =
    status === "approved"
      ? "Aprovada"
      : status === "rejected"
        ? "Reprovada"
        : status === "review"
          ? "Em revisão"
          : "Analisando…";
  const when = new Date(takenAt).toLocaleString("pt-BR");
  return (
    <div className={`rounded-[var(--radius)] border ${tone} p-4`}>
      <p className="font-display">{label}</p>
      <p className="text-xs mt-1 opacity-70">Enviada em {when}</p>
      {reason && <p className="text-sm mt-2 opacity-90">{reason}</p>}
    </div>
  );
}
