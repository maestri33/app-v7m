"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { FieldError, TextareaField } from "@/components/ui/Field";

type Props = {
  materialExternalId: string;
  status: string;
};

export function SubmissionForm({ materialExternalId, status }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(status !== "pending");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/me/training/submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            material_external_id: materialExternalId,
            answer: answer.trim(),
          }),
        });
        const data: { detail?: string } = await res.json();
        if (!res.ok) {
          setError(data.detail ?? "Falha ao enviar.");
          return;
        }
        setSubmitted(true);
        router.push("/treinamento");
        router.refresh();
      } catch {
        setError("Falha de rede. Tente de novo.");
      }
    });
  }

  if (submitted) {
    return (
      <div className="banner banner-ok" role="status">
        <p className="font-display">Resposta enviada</p>
        <p className="text-sm mt-1 opacity-90">
          A IA tá corrigindo e o coordenador confere.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <TextareaField
        label="Sua resposta"
        value={answer}
        onChange={setAnswer}
        rows={10}
        required
      />
      <FieldError>{error}</FieldError>
      <Button type="submit" size="xl" loading={pending} disabled={!answer.trim()} className="w-full">
        {pending ? "Enviando…" : "Enviar resposta"}
      </Button>
    </form>
  );
}
