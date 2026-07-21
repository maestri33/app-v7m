"use client";

import { CopilotKit, useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import { Bot, CheckCircle2, Pencil, Sparkles } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
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

type AssistantEducation = {
  level: string;
  grade: number;
  education_status: string;
  year: number;
  city?: string;
  school?: string;
};

const CURRENT_YEAR = new Date().getFullYear();
const STORAGE_KEY = "v7m-education-draft";

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

const ASSISTANT_INSTRUCTIONS = `Você conduz somente a etapa de escolaridade do cadastro de um promotor V7M.
Fale em português do Brasil, com frases curtas, acolhedoras e sem burocracia.

Descubra, nesta ordem:
1. A última série ou ano que a pessoa estudou, distinguindo Ensino Fundamental de Ensino Médio.
2. Se ela concluiu essa série, ainda está cursando ou parou antes de terminar.
3. Em que ano isso aconteceu. O ano deve ficar entre 1950 e ${CURRENT_YEAR + 1}.
4. Cidade onde estudou e nome da escola. Esses dois dados são opcionais: se não souber ou não quiser informar, siga sem bloquear.

Regras importantes:
- Fundamental aceita do 1º ao 9º ano; Ensino Médio aceita do 1º ao 3º ano.
- Não confunda concluir uma série com concluir todo o nível. Exemplo: concluir o 1º médio não significa ensino médio completo.
- Se a resposta estiver ambígua, faça uma única pergunta objetiva para esclarecer.
- Nunca invente cidade, escola, série ou ano.
- Não fale sobre bolsa, matrícula ou prova antes de terminar esta coleta.
- Quando todos os dados obrigatórios estiverem claros, chame a ferramenta "prepararEscolaridade".
- A ferramenta apenas prepara um resumo. Diga que a pessoa precisa conferir e tocar em "Confirmar e continuar"; nunca afirme que os dados já foram salvos.
- Se a pessoa corrigir uma resposta, chame a ferramenta novamente com o conjunto completo atualizado.`;

function initialDraft(): EducationDraft {
  return {
    level: null,
    grade: null,
    educationStatus: null,
    year: String(CURRENT_YEAR),
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

function cleanOptional(value?: string) {
  const clean = (value ?? "").trim();
  if (/^(não sei|nao sei|não lembro|nao lembro|prefiro não informar|prefiro nao informar)$/i.test(clean)) {
    return "";
  }
  return clean;
}

function normalizeAssistantDraft(args: AssistantEducation): EducationDraft | null {
  const level = args.level === "fundamental" || args.level === "medio" ? args.level : null;
  const educationStatus =
    args.education_status === "completed" ||
    args.education_status === "attending" ||
    args.education_status === "stopped"
      ? args.education_status
      : null;
  const grade = Number(args.grade);
  const year = Number(args.year);
  const validGrade =
    level === "fundamental"
      ? Number.isInteger(grade) && grade >= 1 && grade <= 9
      : level === "medio"
        ? Number.isInteger(grade) && grade >= 1 && grade <= 3
        : false;

  if (
    !level ||
    !educationStatus ||
    !validGrade ||
    !Number.isInteger(year) ||
    year < 1950 ||
    year > CURRENT_YEAR + 1
  ) {
    return null;
  }

  return {
    level,
    grade,
    educationStatus,
    year: String(year),
    city: cleanOptional(args.city),
    school: cleanOptional(args.school),
  };
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

function AssistantToolCard({ args }: { args: Partial<AssistantEducation> }) {
  const level = args.level === "fundamental" || args.level === "medio" ? args.level : null;
  const status =
    args.education_status === "completed" ||
    args.education_status === "attending" ||
    args.education_status === "stopped"
      ? args.education_status
      : null;

  return (
    <div className="rounded-[var(--radius-sm)] border border-brand-gold/40 bg-brand-surface p-3 text-sm">
      <p className="font-semibold text-brand-text">Resumo preparado</p>
      <p className="mt-1 text-brand-muted">
        {levelLabel(level)} · {args.grade ? `${args.grade}º ano` : "série pendente"} · {statusLabel(status)}
      </p>
    </div>
  );
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
              className={`cursor-pointer rounded-[var(--radius-sm)] border px-4 py-3 text-center ${
                draft.level === value
                  ? "border-brand-gold bg-brand-gold-light/10"
                  : "border-brand-border bg-brand-surface"
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
                className={`cursor-pointer rounded-[var(--radius-sm)] border px-3 py-2 text-center ${
                  draft.grade === value
                    ? "border-brand-gold bg-brand-gold-light/10"
                    : "border-brand-border bg-brand-surface"
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
                className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-sm)] border px-4 py-3 ${
                  draft.educationStatus === option.value
                    ? "border-brand-gold bg-brand-gold-light/10"
                    : "border-brand-border bg-brand-surface"
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
                  <span className="block text-sm text-brand-muted">{option.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {draft.educationStatus && (
        <div className="space-y-4">
          <Field
            label="Em que ano foi isso?"
            type="number"
            min={1950}
            max={CURRENT_YEAR + 1}
            value={draft.year}
            onChange={(year) => onChange({ ...draft, year })}
            required
          />
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
    <div className="space-y-4 rounded-[var(--radius)] border border-brand-gold/40 bg-brand-surface p-4" role="status">
      <div className="flex items-start gap-3">
        <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-gold" />
        <div>
          <p className="font-display text-lg">Confira o que entendemos</p>
          <p className="text-sm text-brand-muted">Nada será salvo antes da sua confirmação.</p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <dt className="text-brand-muted">Nível</dt>
        <dd className="text-right font-medium">{levelLabel(draft.level)}</dd>
        <dt className="text-brand-muted">Última série</dt>
        <dd className="text-right font-medium">{draft.grade}º ano</dd>
        <dt className="text-brand-muted">Situação</dt>
        <dd className="text-right font-medium">{statusLabel(draft.educationStatus)}</dd>
        <dt className="text-brand-muted">Ano</dt>
        <dd className="text-right font-medium">{draft.year}</dd>
        <dt className="text-brand-muted">Cidade</dt>
        <dd className="text-right font-medium">{draft.city || "Não informada"}</dd>
        <dt className="text-brand-muted">Escola</dt>
        <dd className="text-right font-medium">{draft.school || "Não informada"}</dd>
      </dl>
      <button
        type="button"
        onClick={onEdit}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-brand-border px-3 text-sm font-semibold text-brand-text"
      >
        <Pencil aria-hidden className="size-4" />
        Corrigir pelas opções
      </button>
    </div>
  );
}

function EducationAssistant({ aiUnavailable }: { aiUnavailable: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode>("assistant");
  const [draft, setDraft] = useState<EducationDraft>(initialDraft);
  const [prepared, setPrepared] = useState(false);
  const [restored, setRestored] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      try {
        const stored = window.sessionStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as { draft?: EducationDraft; prepared?: boolean };
          if (parsed.draft) setDraft(parsed.draft);
          if (parsed.prepared) setPrepared(true);
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
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ draft, prepared }));
  }, [draft, prepared, restored]);

  useCopilotReadable(
    {
      description:
        "Rascunho atual da escolaridade. Campos vazios ainda precisam ser perguntados. Cidade e escola são opcionais.",
      value: draft,
    },
    [draft],
  );

  useCopilotAction(
    {
      name: "prepararEscolaridade",
      description:
        "Prepara o resumo completo da escolaridade depois de coletar e esclarecer todos os campos obrigatórios.",
      parameters: [
        {
          name: "level",
          type: "string",
          description: "Nível canônico: fundamental ou medio.",
          required: true,
        },
        {
          name: "grade",
          type: "number",
          description: "Último ano/série: 1 a 9 no fundamental; 1 a 3 no ensino médio.",
          required: true,
        },
        {
          name: "education_status",
          type: "string",
          description: "Situação canônica: completed, attending ou stopped.",
          required: true,
        },
        {
          name: "year",
          type: "number",
          description: `Ano em que concluiu, cursa ou parou. Entre 1950 e ${CURRENT_YEAR + 1}.`,
          required: true,
        },
        {
          name: "city",
          type: "string",
          description: "Cidade onde estudou. Use string vazia quando não informada.",
          required: false,
        },
        {
          name: "school",
          type: "string",
          description: "Nome da escola. Use string vazia quando não informado.",
          required: false,
        },
      ],
      render: ({ args }) => <AssistantToolCard args={args} />,
      handler: async (args: AssistantEducation) => {
        const normalized = normalizeAssistantDraft(args);
        if (!normalized) {
          return "Os dados ainda estão inválidos ou incompatíveis. Pergunte somente o campo necessário e tente novamente.";
        }
        setDraft(normalized);
        setPrepared(true);
        setError(null);
        return "Resumo preparado. Peça para a pessoa conferir e tocar em Confirmar e continuar.";
      },
    },
    [],
  );

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

      <div className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-brand-border bg-brand-surface px-4 py-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full border border-brand-gold/50 text-brand-gold">
          <Bot aria-hidden className="size-5" />
        </span>
        <div>
          <p className="flex items-center gap-2 font-display text-base">
            Assistente de escolaridade
            <Sparkles aria-hidden className="size-4 text-brand-gold" />
          </p>
          <p className="text-sm text-brand-muted">Responda do seu jeito. Você confere tudo antes de salvar.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Modo de preenchimento">
        <button
          type="button"
          onClick={() => setMode("assistant")}
          aria-pressed={mode === "assistant"}
          className={`min-h-11 rounded-[var(--radius-sm)] border px-3 text-sm font-semibold ${
            mode === "assistant"
              ? "border-brand-gold bg-brand-gold-light/10 text-brand-text"
              : "border-brand-border text-brand-muted"
          }`}
        >
          Conversar
        </button>
        <button
          type="button"
          onClick={() => setMode("manual")}
          aria-pressed={mode === "manual"}
          className={`min-h-11 rounded-[var(--radius-sm)] border px-3 text-sm font-semibold ${
            mode === "manual"
              ? "border-brand-gold bg-brand-gold-light/10 text-brand-text"
              : "border-brand-border text-brand-muted"
          }`}
        >
          Responder por opções
        </button>
      </div>

      {mode === "assistant" ? (
        <div className="space-y-4">
          {aiUnavailable && (
            <div className="banner" role="alert">
              <p className="font-semibold">O assistente não respondeu agora.</p>
              <p className="mt-1 text-sm">Suas respostas não foram perdidas. Use as opções para continuar.</p>
              <button
                type="button"
                onClick={() => setMode("manual")}
                className="mt-3 min-h-11 rounded-[var(--radius-sm)] border border-current px-4 text-sm font-semibold"
              >
                Continuar pelas opções
              </button>
            </div>
          )}
          <div className="education-copilot overflow-hidden rounded-[var(--radius)] border border-brand-border">
            <CopilotChat
              className="education-copilot-chat"
              instructions={ASSISTANT_INSTRUCTIONS}
              labels={{
                title: "Escolaridade",
                initial:
                  "Oi! Pode falar do seu jeito: qual foi a última série ou ano que você estudou?",
                placeholder: "Ex.: parei no 8º ano…",
              }}
            />
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
        disabled={validateDraft(draft) !== null}
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
  const [aiUnavailable, setAiUnavailable] = useState(false);

  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      enableInspector={false}
      showDevConsole={false}
      onError={() => setAiUnavailable(true)}
    >
      <EducationAssistant aiUnavailable={aiUnavailable} />
    </CopilotKit>
  );
}
