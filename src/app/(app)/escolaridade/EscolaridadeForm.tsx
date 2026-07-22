"use client";

import { ArrowUp, Bot, CheckCircle2, LoaderCircle, Pencil, Sparkles } from "lucide-react";
import { type FormEvent, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { apiErrorMessage } from "@/lib/api/error-messages";
import { NEXT_STAGE, wrongStatusHref } from "@/lib/candidate/funnel";

type Level = "fundamental" | "medio";
type EducationStatus = "completed" | "attending" | "stopped";
type Mode = "assistant" | "manual";

type EducationDraft = {
  level: Level | null;
  grade: number | null;
  educationStatus: EducationStatus | null;
  year: string;
  city: string;
  school: string;
};

type EducationMessage = {
  role: "assistant" | "user";
  content: string;
};

type AssistantResponse = {
  reply?: string;
  ready?: boolean;
  detail?: string;
  code?: string;
  draft?: {
    level: Level | null;
    grade: number | null;
    education_status: EducationStatus | null;
    year: number | null;
    city: string;
    school: string;
  };
};

const CURRENT_YEAR = new Date().getFullYear();
const STORAGE_KEY = "v7m-education-draft";
const INITIAL_MESSAGES: EducationMessage[] = [
  {
    role: "assistant",
    content:
      "Qual foi a última série ou ano que você frequentou? Diga também se concluiu ou parou no meio.",
  },
];

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

function initialDraft(): EducationDraft {
  return {
    level: null,
    grade: null,
    educationStatus: null,
    year: "",
    city: "",
    school: "",
  };
}

function levelLabel(level: Level | null) {
  if (level === "fundamental") return "Ensino Fundamental";
  if (level === "medio") return "Ensino Médio";
  return "Não informado";
}

function statusLabel(status: EducationStatus | null) {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? "Não informado";
}

function validateDraft(draft: EducationDraft) {
  if (!draft.level) return "Informe se a última série foi no Fundamental ou no Ensino Médio.";
  if (!draft.grade) return "Informe a última série ou ano estudado.";
  if (!draft.educationStatus) return "Informe se concluiu, está cursando ou parou no meio.";

  const year = Number(draft.year);
  if (!Number.isInteger(year) || year < 1950 || year > CURRENT_YEAR + 1) {
    return `Informe um ano entre 1950 e ${CURRENT_YEAR + 1}.`;
  }
  return null;
}

function EducationFields({
  draft,
  onChange,
}: {
  draft: EducationDraft;
  onChange: (next: EducationDraft) => void;
}) {
  const grades =
    draft.level === "fundamental" ? Array.from({ length: 9 }, (_, index) => index + 1) : [1, 2, 3];
  const yearLabel =
    draft.educationStatus === "completed"
      ? "Em que ano concluiu essa série?"
      : draft.educationStatus === "attending"
        ? "Em que ano começou a cursar essa série?"
        : "Em que ano parou de estudar?";

  function chooseLevel(level: Level) {
    onChange({ ...draft, level, grade: null, educationStatus: null });
  }

  return (
    <div className="space-y-6">
      <fieldset className="space-y-3">
        <legend className="label">Em qual nível foi sua última série?</legend>
        <div className="grid grid-cols-2 gap-3">
          {(["fundamental", "medio"] as const).map((value) => (
            <label
              key={value}
              className={`cursor-pointer rounded-[var(--radius-sm)] border px-4 py-3 text-center transition-colors duration-200 hover:border-brand-gold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-gold ${
                draft.level === value
                  ? "border-brand-gold bg-brand-gold-light/10"
                  : "border-[var(--surface-border)] bg-[var(--surface)]"
              }`}
            >
              <input
                className="sr-only"
                type="radio"
                name="education_level"
                checked={draft.level === value}
                onChange={() => chooseLevel(value)}
              />
              {value === "fundamental" ? "Fundamental" : "Ensino médio"}
            </label>
          ))}
        </div>
      </fieldset>

      {draft.level && (
        <fieldset className="space-y-3">
          <legend className="label">Qual foi a última série/ano?</legend>
          <div className="grid grid-cols-3 gap-2">
            {grades.map((value) => (
              <label
                key={value}
                className={`cursor-pointer rounded-[var(--radius-sm)] border px-3 py-2 text-center transition-colors duration-200 hover:border-brand-gold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-gold ${
                  draft.grade === value
                    ? "border-brand-gold bg-brand-gold-light/10"
                    : "border-[var(--surface-border)] bg-[var(--surface)]"
                }`}
              >
                <input
                  className="sr-only"
                  type="radio"
                  name="education_grade"
                  checked={draft.grade === value}
                  onChange={() => onChange({ ...draft, grade: value, educationStatus: null })}
                />
                {value}º {draft.level === "fundamental" ? "ano" : "médio"}
                {draft.level === "fundamental" && value === 9 ? (
                  <span className="mt-1 block text-xs font-normal text-[var(--surface-text-muted)]">
                    antiga 8ª série
                  </span>
                ) : null}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {draft.grade && (
        <fieldset className="space-y-3">
          <legend className="label">O que aconteceu nessa série/ano?</legend>
          <div className="space-y-2">
            {STATUS_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-sm)] border px-4 py-3 transition-colors duration-200 hover:border-brand-gold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-gold ${
                  draft.educationStatus === option.value
                    ? "border-brand-gold bg-brand-gold-light/10"
                    : "border-[var(--surface-border)] bg-[var(--surface)]"
                }`}
              >
                <input
                  className="accent-gold-deep mt-1"
                  type="radio"
                  name="education_status"
                  checked={draft.educationStatus === option.value}
                  onChange={() => onChange({ ...draft, educationStatus: option.value })}
                />
                <span>
                  <span className="block font-medium">{option.label}</span>
                  <span className="block text-sm text-[var(--surface-text-muted)]">{option.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {draft.educationStatus && (
        <div className="space-y-4">
          <Field
            label={yearLabel}
            type="number"
            min={1950}
            max={CURRENT_YEAR + 1}
            value={draft.year}
            onChange={(year) => onChange({ ...draft, year })}
            required
          />
          <p className="field-hint">Se não lembrar exatamente, informe o ano aproximado.</p>
          <Field
            label="Cidade onde estudou (opcional)"
            value={draft.city}
            onChange={(city) => onChange({ ...draft, city })}
          />
          <Field
            label="Nome da escola (opcional)"
            value={draft.school}
            onChange={(school) => onChange({ ...draft, school })}
          />
        </div>
      )}
    </div>
  );
}

function EducationReview({ draft, onEdit }: { draft: EducationDraft; onEdit: () => void }) {
  return (
    <div className="space-y-4 rounded-[var(--radius)] border border-brand-gold/40 bg-[var(--surface)] p-4" role="status">
      <div className="flex items-start gap-3">
        <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-gold" />
        <div>
          <p className="font-display text-lg">Confira o que entendemos</p>
          <p className="text-sm text-[var(--surface-text-muted)]">Nada será salvo antes da sua confirmação.</p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <dt className="text-[var(--surface-text-muted)]">Nível</dt>
        <dd className="text-right font-medium">{levelLabel(draft.level)}</dd>
        <dt className="text-[var(--surface-text-muted)]">Última série</dt>
        <dd className="text-right font-medium">{draft.grade}º ano</dd>
        <dt className="text-[var(--surface-text-muted)]">Situação</dt>
        <dd className="text-right font-medium">{statusLabel(draft.educationStatus)}</dd>
        <dt className="text-[var(--surface-text-muted)]">Ano</dt>
        <dd className="text-right font-medium">{draft.year}</dd>
        <dt className="text-[var(--surface-text-muted)]">Cidade</dt>
        <dd className="text-right font-medium">{draft.city || "Não informada"}</dd>
        <dt className="text-[var(--surface-text-muted)]">Escola</dt>
        <dd className="text-right font-medium">{draft.school || "Não informada"}</dd>
      </dl>
      <button
        type="button"
        onClick={onEdit}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--surface-border)] px-3 text-sm font-semibold text-[var(--surface-text)]"
      >
        <Pencil aria-hidden className="size-4" />
        Corrigir pelas opções
      </button>
    </div>
  );
}

function EducationAssistant() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode>("assistant");
  const [draft, setDraft] = useState<EducationDraft>(initialDraft);
  const [prepared, setPrepared] = useState(false);
  const [restored, setRestored] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<EducationMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [assistantUnavailable, setAssistantUnavailable] = useState(false);

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      try {
        const stored = window.sessionStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as {
            draft?: EducationDraft;
            prepared?: boolean;
            messages?: EducationMessage[];
          };
          if (parsed.draft) {
            const restoredDraft = { ...initialDraft(), ...parsed.draft };
            if (!restoredDraft.level && !restoredDraft.grade && !restoredDraft.educationStatus) {
              restoredDraft.year = "";
            }
            setDraft(restoredDraft);
            setPrepared(Boolean(parsed.prepared) && validateDraft(restoredDraft) === null);
          }
          if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
            setMessages(
              parsed.messages
                .filter(
                  (message) =>
                    (message.role === "assistant" || message.role === "user") &&
                    typeof message.content === "string",
                )
                .slice(-8),
            );
          }
        }
      } catch {
        window.sessionStorage.removeItem(STORAGE_KEY);
      } finally {
        setRestored(true);
      }
    }, 0);
    return () => window.clearTimeout(restoreTimer);
  }, []);

  useEffect(() => {
    if (!restored) return;
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ draft, prepared, messages: messages.slice(-8) }),
    );
  }, [draft, messages, prepared, restored]);

  async function sendAssistantMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message || thinking) return;

    const history = messages.slice(-4);
    setMessages((current) => [...current, { role: "user", content: message }]);
    setInput("");
    setThinking(true);
    setPrepared(false);
    setAssistantUnavailable(false);
    setError(null);

    try {
      const response = await fetch("/api/me/education/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, draft, history }),
        signal: AbortSignal.timeout(10_000),
      });
      const data = (await response.json()) as AssistantResponse;
      if (response.status === 401) {
        router.push("/");
        return;
      }
      if (!response.ok || !data.draft || !data.reply) {
        throw new Error(data.detail || "ASSISTANT_UNAVAILABLE");
      }

      const nextDraft: EducationDraft = {
        level: data.draft.level,
        grade: data.draft.grade,
        educationStatus: data.draft.education_status,
        year: data.draft.year ? String(data.draft.year) : "",
        city: data.draft.city || "",
        school: data.draft.school || "",
      };
      setDraft(nextDraft);
      setPrepared(Boolean(data.ready) && validateDraft(nextDraft) === null);
      setMessages((current) => [...current, { role: "assistant", content: data.reply as string }]);
    } catch {
      setAssistantUnavailable(true);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "Não consegui entender agora. Tente novamente ou continue pelas opções.",
        },
      ]);
    } finally {
      setThinking(false);
    }
  }

  function saveEducation() {
    const validationError = validateDraft(draft);
    if (validationError || pending) {
      setError(validationError);
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/me/education", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            level: draft.level,
            grade: draft.grade,
            education_status: draft.educationStatus,
            completed:
              draft.educationStatus === "completed" &&
              ((draft.level === "fundamental" && draft.grade === 9) ||
                (draft.level === "medio" && draft.grade === 3)),
            year: Number(draft.year),
            city: draft.city.trim() || null,
            school: draft.school.trim() || null,
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
        window.sessionStorage.removeItem(STORAGE_KEY);
        router.push(NEXT_STAGE.education);
      } catch {
        setError("A conexão oscilou. Tente novamente — suas respostas continuam aqui.");
      }
    });
  }

  return (
    <div className="space-y-5">
      {pending && <LoadingOverlay label="Salvando escolaridade…" logo />}

      <div className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface)] px-4 py-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full border border-brand-gold/50 text-brand-gold">
          <Bot aria-hidden className="size-5" />
        </span>
        <div>
          <p className="flex items-center gap-2 font-display text-base">
            Assistente de escolaridade
            <Sparkles aria-hidden className="size-4 text-brand-gold" />
          </p>
          <p className="text-sm text-[var(--surface-text-muted)]">Responda do seu jeito. Você confere tudo antes de salvar.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Modo de preenchimento">
        <button
          type="button"
          onClick={() => setMode("assistant")}
          aria-pressed={mode === "assistant"}
          className={`min-h-11 cursor-pointer rounded-[var(--radius-sm)] border px-3 text-sm font-semibold transition-colors duration-200 hover:border-brand-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold ${
            mode === "assistant"
              ? "border-brand-gold bg-brand-gold-light/10 text-[var(--surface-text)]"
              : "border-[var(--surface-border)] text-[var(--surface-text-muted)]"
          }`}
        >
          Conversar
        </button>
        <button
          type="button"
          onClick={() => setMode("manual")}
          aria-pressed={mode === "manual"}
          className={`min-h-11 cursor-pointer rounded-[var(--radius-sm)] border px-3 text-sm font-semibold transition-colors duration-200 hover:border-brand-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold ${
            mode === "manual"
              ? "border-brand-gold bg-brand-gold-light/10 text-[var(--surface-text)]"
              : "border-[var(--surface-border)] text-[var(--surface-text-muted)]"
          }`}
        >
          Responder por opções
        </button>
      </div>

      {mode === "assistant" ? (
        <div className="space-y-4">
          {assistantUnavailable && !prepared && (
            <div className="banner" role="alert">
              <p className="font-semibold">O assistente não respondeu agora.</p>
              <p className="mt-1 text-sm">Suas respostas não foram perdidas. Use as opções para continuar.</p>
              <button
                type="button"
                onClick={() => setMode("manual")}
                className="mt-3 min-h-11 cursor-pointer rounded-[var(--radius-sm)] border border-current px-4 text-sm font-semibold transition-colors duration-200 hover:bg-current/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
              >
                Continuar pelas opções
              </button>
            </div>
          )}
          <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--surface-border)] bg-[var(--surface)]">
            <div className="max-h-80 min-h-48 space-y-3 overflow-y-auto p-4" role="log" aria-live="polite">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`max-w-[88%] rounded-[var(--radius-sm)] px-3 py-2 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "ml-auto bg-brand-gold text-brand-ink"
                      : "border border-[var(--surface-border)] bg-[var(--surface-alt)] text-[var(--surface-text)]"
                  }`}
                >
                  {message.content}
                </div>
              ))}
              {thinking && (
                <div className="flex max-w-[88%] items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-alt)] px-3 py-2 text-sm text-[var(--surface-text-muted)]">
                  <LoaderCircle aria-hidden className="size-4 animate-spin" />
                  Entendendo sua resposta…
                </div>
              )}
            </div>
            <form onSubmit={sendAssistantMessage} className="border-t border-[var(--surface-border)] p-3">
              <label htmlFor="education-message" className="sr-only">
                Resposta sobre sua escolaridade
              </label>
              <div className="flex items-end gap-2 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-alt)] p-2 focus-within:border-brand-gold">
                <textarea
                  id="education-message"
                  rows={2}
                  maxLength={500}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  disabled={thinking}
                  placeholder="Ex.: parei no 8º ano em 2022"
                  className="min-h-12 flex-1 resize-none bg-transparent px-2 py-1 text-base text-[var(--surface-text)] outline-none placeholder:text-[var(--surface-text-muted)]"
                />
                <button
                  type="submit"
                  disabled={thinking || !input.trim()}
                  className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] bg-brand-gold px-4 text-sm font-semibold text-brand-ink transition-colors duration-200 hover:bg-brand-gold-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Enviar resposta"
                >
                  <ArrowUp aria-hidden className="size-4" />
                  Enviar
                </button>
              </div>
            </form>
            <p className="px-4 pb-4 text-xs leading-relaxed text-[var(--surface-text-muted)]">
              Sua resposta é processada pelo assistente apenas para organizar estes dados. Você confere tudo antes de salvar.
            </p>
          </div>
          {prepared && <EducationReview draft={draft} onEdit={() => setMode("manual")} />}
        </div>
      ) : (
        <EducationFields
          draft={draft}
          onChange={(next) => {
            setDraft(next);
            setPrepared(validateDraft(next) === null);
            setError(null);
          }}
        />
      )}

      <FieldError>{error}</FieldError>
      <Button
        type="button"
        size="xl"
        loading={pending}
        disabled={thinking || pending}
        onClick={saveEducation}
        className="w-full"
      >
        {pending ? "Salvando…" : "Confirmar e continuar"}
      </Button>
      <p className="field-hint">
        Cidade e escola ajudam, mas não bloqueiam. Quem ainda não concluiu o ensino médio pode entrar no programa e conquistar a bolsa pelas indicações pagas.
      </p>
    </div>
  );
}

export function EscolaridadeForm() {
  return <EducationAssistant />;
}
