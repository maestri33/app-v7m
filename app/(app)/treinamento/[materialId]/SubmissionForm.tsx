"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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
      <p className="text-paper">
        Resposta enviada. A IA tá corrigindo e o coordenador confere.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <label className="block">
        <span className="block text-sm text-muted-on-dark mb-2">Sua resposta</span>
        <textarea
          required
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={10}
          className="w-full rounded-[var(--radius)] bg-char-2 border border-line-light/20 px-4 py-3 text-paper focus-visible:border-gold focus-visible:outline-none"
        />
      </label>
      {error && (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-xl w-full" disabled={pending || !answer.trim()}>
        {pending ? "Enviando…" : "Enviar resposta"}
      </button>
    </form>
  );
}
