"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";

import {
  SelfieExperience,
  type SelfieAnalysisResult,
  type SelfieExperienceState,
} from "@/components/selfie-experience";
import { Spinner } from "@/components/ui/spinner";
import { apiErrorMessage } from "@/lib/api/error-messages";
import type { AnalysisStatus } from "@/lib/api/types";
import { NEXT_STAGE, wrongStatusHref } from "@/lib/candidate/funnel";

type SelfieSection = {
  taken_at?: string | null;
  analysis_status?: AnalysisStatus;
  analysis_reason?: string | null;
  expires_at?: string | null;
  hub_whatsapp?: string | null;
};

type SelfieFormProps = {
  contractText: string;
  contractVersion: string;
};

const POLL_MS = 2500;

function experienceState(data: SelfieSection | undefined): SelfieExperienceState {
  if (!data?.taken_at) return "agreement";
  if (data.analysis_status === "approved") return "approved";
  if (data.analysis_status === "rejected") return "rejected";
  if (data.analysis_status === "review") return "manual-review";
  return "analyzing";
}

function analysisResult(data: SelfieSection | undefined): SelfieAnalysisResult {
  const state = experienceState(data);
  if (state === "approved" || state === "rejected" || state === "manual-review") return state;
  return "analyzing";
}

export function SelfieForm({ contractText, contractVersion }: SelfieFormProps) {
  const router = useRouter();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pollMs, setPollMs] = useState(POLL_MS);
  const pendingPolls = useRef(0);

  const { data, mutate } = useSWR<SelfieSection>(
    "/api/me/selfie",
    async (url: string) => {
      const response = await fetch(url, { cache: "no-store" });
      if (response.status === 403) {
        window.location.assign("/painel");
        throw new Error("role-transitioned");
      }
      if (response.status === 401) {
        window.location.assign("/");
        throw new Error("session-expired");
      }
      if (!response.ok) throw new Error("selfie-load-failed");
      return response.json();
    },
    {
      refreshInterval: (latest) => {
        if (!latest?.taken_at || latest.analysis_status !== "pending") {
          pendingPolls.current = 0;
          return 0;
        }
        const interval = Math.min(pollMs * 2 ** pendingPolls.current, 30_000);
        pendingPolls.current += 1;
        return interval;
      },
    },
  );

  async function upload(photo: Blob | null): Promise<SelfieAnalysisResult> {
    if (!photo) {
      setUploadError("Não encontramos a foto capturada. Tire outra selfie.");
      return "rejected";
    }

    setUploadError(null);
    try {
      const file = photo instanceof File
        ? photo
        : new File([photo], "selfie.jpg", { type: photo.type || "image/jpeg" });
      const form = new FormData();
      form.append("photo", file, file.name);
      const response = await fetch("/api/me/selfie", { method: "POST", body: form });
      const result: {
        detail?: string;
        code?: string;
        expected_status?: string;
        poll_after_ms?: number;
      } = await response.json().catch(() => ({}));

      if (!response.ok) {
        const redirectTo = wrongStatusHref(result.code, result.expected_status);
        if (redirectTo) {
          router.push(redirectTo);
          return "analyzing";
        }
        setUploadError(apiErrorMessage(result.code, result.detail, result));
        return "network-error";
      }

      if (typeof result.poll_after_ms === "number" && result.poll_after_ms > 0) {
        setPollMs(result.poll_after_ms);
      }
      return analysisResult(await mutate());
    } catch {
      setUploadError("A conexão oscilou. Tente de novo — nada foi perdido.");
      return "network-error";
    }
  }

  if (!data) {
    return (
      <p className="flex items-center gap-2 text-sm text-[var(--surface-text-muted)]" role="status">
        <Spinner /> Carregando…
      </p>
    );
  }

  return (
    <SelfieExperience
      key={`${data.taken_at ?? "new"}-${data.analysis_status ?? "pending"}`}
      initialState={experienceState(data)}
      agreementText={contractText}
      agreementVersion={contractVersion}
      rejectionReason={data.analysis_reason}
      networkErrorMessage={uploadError}
      hubWhatsapp={data.hub_whatsapp}
      onAnalyze={upload}
      onComplete={() => router.push(NEXT_STAGE.selfie)}
      onBack={() => router.push("/escolaridade")}
    />
  );
}
