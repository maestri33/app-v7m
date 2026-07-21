"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { NEXT_STAGE, wrongStatusHref } from "@/lib/candidate/funnel";
import { apiErrorMessage } from "@/lib/api/error-messages";

type Level = "fundamental" | "medio";
type EducationStatus = "completed" | "attending" | "stopped";

const STATUS_OPTIONS: Array<{
  value: EducationStatus;
  label: string;
  hint: string;
}> = [
  {
    value: "completed",
    label: "Concluí essa série/ano",
    hint: "Terminei e fui aprovado nessa etapa.",
  },
  {
    value: "attending",
    label: "Ainda estou cursando",
    hint: "Estou matriculado e estudando agora.",
  },
  {
    value: "stopped",
    label: "Parei antes de terminar",
    hint: "Comecei a série/ano, mas interrompi no meio.",
  },
];

export function EscolaridadeForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [level, setLevel] = useState<Level | null>(null);
  const [grade, setGrade] = useState<number | null>(null);
  const [educationStatus, setEducationStatus] = useState<EducationStatus | null>(null);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [city, setCity] = useState("");
  const [school, setSchool] = useState("");
  const [error, setError] = useState<string | null>(null);

  const grades = level === "fundamental" ? Array.from({ length: 9 }, (_, i) => i + 1) : [1, 2, 3];

  function chooseLevel(next: Level) {
    setLevel(next);
    setGrade(null);
    setEducationStatus(null);
    setError(null);
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!level || !grade || !educationStatus || pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/me/education", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            level,
            grade,
            education_status: educationStatus,
            completed:
              educationStatus === "completed" &&
              ((level === "fundamental" && grade === 9) || (level === "medio" && grade === 3)),
            year: Number(year),
            city: city.trim() || null,
            school: school.trim() || null,
          }),
        });
        const data: { detail?: string; code?: string; expected_status?: string } =
          await response.json();
        if (!response.ok) {
          const redirectTo = wrongStatusHref(data.code, data.expected_status);
          if (redirectTo) {
            router.push(redirectTo);
            return;
          }
          setError(apiErrorMessage(data.code, data.detail, data));
          return;
        }
        router.push(NEXT_STAGE.education);
      } catch {
        setError("A conexão oscilou. Tente novamente — nada foi perdido.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {pending && <LoadingOverlay label="Salvando escolaridade…" logo />}

      <fieldset className="space-y-3">
        <legend className="label">Em qual nível foi sua última série?</legend>
        <div className="grid grid-cols-2 gap-3">
          {(["fundamental", "medio"] as const).map((value) => (
            <label
              key={value}
              className={`cursor-pointer rounded-[var(--radius-sm)] border px-4 py-3 text-center ${
                level === value
                  ? "border-brand-gold bg-brand-gold-light/10"
                  : "border-brand-border bg-brand-surface"
              }`}
            >
              <input
                className="sr-only"
                type="radio"
                name="education_level"
                checked={level === value}
                onChange={() => chooseLevel(value)}
              />
              {value === "fundamental" ? "Fundamental" : "Ensino médio"}
            </label>
          ))}
        </div>
      </fieldset>

      {level && (
        <fieldset className="space-y-3">
          <legend className="label">Qual foi a última série/ano?</legend>
          <div className="grid grid-cols-3 gap-2">
            {grades.map((value) => (
              <label
                key={value}
                className={`cursor-pointer rounded-[var(--radius-sm)] border px-3 py-2 text-center ${
                  grade === value
                    ? "border-brand-gold bg-brand-gold-light/10"
                    : "border-brand-border bg-brand-surface"
                }`}
              >
                <input
                  className="sr-only"
                  type="radio"
                  name="education_grade"
                  checked={grade === value}
                  onChange={() => setGrade(value)}
                />
                {value}º {level === "fundamental" ? "ano" : "médio"}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {grade && (
        <fieldset className="space-y-3">
          <legend className="label">O que aconteceu nessa série/ano?</legend>
          <div className="space-y-2">
            {STATUS_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-sm)] border px-4 py-3 ${
                  educationStatus === option.value
                    ? "border-brand-gold bg-brand-gold-light/10"
                    : "border-brand-border bg-brand-surface"
                }`}
              >
                <input
                  className="accent-gold-deep mt-1"
                  type="radio"
                  name="education_status"
                  checked={educationStatus === option.value}
                  onChange={() => setEducationStatus(option.value)}
                />
                <span>
                  <span className="block font-medium">{option.label}</span>
                  <span className="block text-sm text-brand-muted">{option.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {educationStatus && (
        <div className="space-y-4">
          <Field
            label="Em que ano foi isso?"
            type="number"
            value={year}
            onChange={setYear}
            required
          />
          <Field
            label="Cidade onde estudou (opcional)"
            value={city}
            onChange={setCity}
          />
          <Field
            label="Nome da escola (opcional)"
            value={school}
            onChange={setSchool}
          />
        </div>
      )}

      <FieldError>{error}</FieldError>
      <Button
        type="submit"
        size="xl"
        loading={pending}
        disabled={!level || !grade || !educationStatus || !year}
        className="w-full"
      >
        {pending ? "Salvando…" : "Confirmar e continuar"}
      </Button>
      <p className="field-hint">
        Cidade e escola ajudam, mas não bloqueiam. Quem ainda não concluiu o ensino médio pode entrar no programa e conquistar a bolsa pelas indicações pagas.
      </p>
    </form>
  );
}
