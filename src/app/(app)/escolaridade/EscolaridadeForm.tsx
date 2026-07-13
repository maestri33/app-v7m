"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { NEXT_STAGE, wrongStatusHref } from "@/lib/candidate/funnel";

/**
 * Escolaridade — ÚLTIMA pergunta antes da selfie (a selfie aprovada
 * auto-promove, então o nível precisa estar gravado antes — plan do back).
 * Só nível + concluiu: sem médio completo o promotor nasce `pre_matriculado`
 * e o funil de aluno resolve depois; aqui nada bloqueia.
 */
const LEVELS = [
  {
    value: "fundamental",
    label: "Ensino fundamental",
    hint: "Estudei até o fundamental (1º ao 9º ano)",
  },
  {
    value: "medio",
    label: "Ensino médio",
    hint: "Cheguei ao ensino médio (ou fui além)",
  },
] as const;

type Level = (typeof LEVELS)[number]["value"];

export function EscolaridadeForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [level, setLevel] = useState<Level | null>(null);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!level || pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/me/education", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ level, completed }),
        });
        const data: { detail?: string; code?: string; expected_status?: string } =
          await res.json();
        if (!res.ok) {
          const redir = wrongStatusHref(data.code, data.expected_status);
          if (redir) {
            router.push(redir);
            return;
          }
          setError(data.detail ?? "Não deu pra salvar agora. Tente de novo.");
          return;
        }
        // Wizard auto-avançante: escolaridade gravada → selfie (último passo).
        router.push(NEXT_STAGE.education);
      } catch {
        setError("A conexão oscilou. Tente de novo — nada foi perdido.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <fieldset className="space-y-3">
        <legend className="label">Até onde você estudou?</legend>
        <div className="space-y-3">
          {LEVELS.map((l) => (
            <label
              key={l.value}
              className={`flex items-start gap-3 rounded-[var(--radius-sm)] border px-4 py-3 transition-colors ${
                level === l.value
                  ? "border-brand-gold bg-brand-gold-light/10"
                  : "border-brand-border bg-brand-surface"
              } cursor-pointer hover:border-brand-gold-dark`}
            >
              <input
                type="radio"
                name="education_level"
                value={l.value}
                checked={level === l.value}
                onChange={() => setLevel(l.value)}
                className="accent-gold-deep mt-1"
              />
              <span>
                <span className="block font-medium">{l.label}</span>
                <span className="block text-sm text-brand-muted">{l.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={completed}
          onChange={(e) => setCompleted(e.target.checked)}
          className="accent-gold-deep mt-1"
        />
        <span className="text-sm">Já concluí esse nível</span>
      </label>
      <FieldError>{error}</FieldError>
      <Button
        type="submit"
        size="xl"
        loading={pending}
        disabled={!level}
        className="w-full"
      >
        {pending ? "Salvando…" : "Salvar e continuar"}
      </Button>
      <p className="field-hint">
        Não precisa ter concluído pra ser promotor — quem não fechou o ensino
        médio pode inclusive estudar com a gente.
      </p>
    </form>
  );
}
