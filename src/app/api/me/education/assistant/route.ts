import { NextResponse } from "next/server";
import OpenAI from "openai";

import { readSession } from "@/lib/auth/server";

type Level = "fundamental" | "medio";
type EducationStatus = "completed" | "attending" | "stopped";

type DraftInput = {
  level?: Level | null;
  grade?: number | null;
  educationStatus?: EducationStatus | null;
  year?: string;
  city?: string;
  school?: string;
};

type HistoryMessage = {
  role: "assistant" | "user";
  content: string;
};

const CURRENT_YEAR = new Date().getFullYear();
const BASE_URL = process.env.OMNIROUTE_BASE_URL ?? "";
const API_KEY = process.env.OMNIROUTE_API_KEY ?? "";
const MODEL = process.env.OMNIROUTE_EDUCATION_MODEL ?? "groq/llama-3.3-70b-versatile";

const openai = new OpenAI({
  baseURL: `${BASE_URL}/v1`,
  apiKey: API_KEY,
  maxRetries: 0,
  timeout: 7_000,
});

function normalizedText(value: unknown) {
  return typeof value === "string"
    ? value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase()
    : "";
}

function normalizeLevel(value: unknown): Level | null {
  const text = normalizedText(value);
  if (text.includes("fundamental")) return "fundamental";
  if (text.includes("medio")) return "medio";
  return null;
}

function normalizeStatus(value: unknown): EducationStatus | null {
  const text = normalizedText(value);
  if (/conclu|aprov|termin/.test(text)) return "completed";
  if (/curs|matric|estudando/.test(text)) return "attending";
  if (/par|aband|interrom|incomplet/.test(text)) return "stopped";
  return null;
}

function normalizeNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").match(/\d+/)?.[0]);
  return Number.isInteger(parsed) ? parsed : null;
}

function normalizeOptional(value: unknown) {
  const clean = typeof value === "string" ? value.trim() : "";
  if (/^(não sei|nao sei|não lembro|nao lembro|null)$/i.test(clean)) return "";
  return clean.slice(0, 120);
}

function extractMessageHints(message: string) {
  const text = normalizedText(message);
  const numericGrade = text.match(/\b([1-9])\s*(?:º|°|o)?\s*(?:ano|serie|medio)\b/);
  const wordGrades: Array<[RegExp, number]> = [
    [/\bprimeir[oa]\b/, 1],
    [/\bsegund[oa]\b/, 2],
    [/\bterceir[oa]\b/, 3],
    [/\bquart[oa]\b/, 4],
    [/\bquint[oa]\b/, 5],
    [/\bsext[oa]\b/, 6],
    [/\bsetim[oa]\b/, 7],
    [/\boitav[oa]\b/, 8],
    [/\bnon[oa]\b/, 9],
  ];
  const wordGrade = wordGrades.find(([pattern]) => pattern.test(text))?.[1] ?? null;
  const grade = numericGrade ? Number(numericGrade[1]) : wordGrade;
  const level = /ensino medio|\bmedio\b/.test(text)
    ? "medio"
    : /fundamental/.test(text) || Boolean(grade && grade >= 4)
      ? "fundamental"
      : null;
  const educationStatus = /parei|aband|interromp|nao conclui/.test(text)
    ? "stopped"
    : /curs|matric|estudando/.test(text)
      ? "attending"
      : /conclu|terminei|aprov/.test(text)
        ? "completed"
        : null;
  const explicitYear = text.match(/\b(19\d{2}|20\d{2})\b/);
  const year = explicitYear
    ? Number(explicitYear[1])
    : /este ano|esse ano/.test(text)
      ? CURRENT_YEAR
      : /ano passado/.test(text)
        ? CURRENT_YEAR - 1
        : null;

  return { level, grade, educationStatus, year } as const;
}

function normalizePreviousDraft(value: unknown) {
  const draft = value && typeof value === "object" ? (value as DraftInput) : {};
  return {
    level: draft.level === "fundamental" || draft.level === "medio" ? draft.level : null,
    grade: normalizeNumber(draft.grade),
    education_status:
      draft.educationStatus === "completed" ||
      draft.educationStatus === "attending" ||
      draft.educationStatus === "stopped"
        ? draft.educationStatus
        : null,
    year: normalizeNumber(draft.year),
    city: normalizeOptional(draft.city),
    school: normalizeOptional(draft.school),
  };
}

function validGrade(level: Level | null, grade: number | null) {
  if (!level || !grade) return false;
  return level === "fundamental" ? grade >= 1 && grade <= 9 : grade >= 1 && grade <= 3;
}

function fallbackReply(draft: {
  level: Level | null;
  grade: number | null;
  education_status: EducationStatus | null;
  year: number | null;
}) {
  if (!draft.level) return "Essa série foi no Ensino Fundamental ou no Ensino Médio?";
  if (!validGrade(draft.level, draft.grade)) return "Qual foi exatamente a última série ou ano?";
  if (!draft.education_status) return "Você concluiu essa série, ainda está cursando ou parou antes de terminar?";
  if (!draft.year) return "Em que ano isso aconteceu?";
  return "Entendi. Confira o resumo abaixo antes de continuar.";
}

function extractJson(content: string) {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("MODEL_JSON_INVALID");
  return JSON.parse(content.slice(start, end + 1)) as Record<string, unknown>;
}

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ detail: "Sessão expirada.", code: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!BASE_URL || !API_KEY) {
    return NextResponse.json(
      { detail: "Assistente temporariamente indisponível.", code: "ASSISTANT_UNAVAILABLE" },
      { status: 503 },
    );
  }

  try {
    const body = (await req.json()) as {
      message?: unknown;
      draft?: unknown;
      history?: unknown;
    };
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 500) : "";
    if (!message) {
      return NextResponse.json({ detail: "Escreva uma resposta.", code: "EMPTY_MESSAGE" }, { status: 400 });
    }

    const previous = normalizePreviousDraft(body.draft);
    const history = Array.isArray(body.history)
      ? body.history
          .filter(
            (item): item is HistoryMessage =>
              Boolean(
                item &&
                  typeof item === "object" &&
                  ((item as HistoryMessage).role === "assistant" || (item as HistoryMessage).role === "user") &&
                  typeof (item as HistoryMessage).content === "string",
              ),
          )
          .slice(-4)
          .map((item) => ({ role: item.role, content: item.content.slice(0, 240) }))
      : [];

    const completion = await openai.chat.completions.create(
      {
        model: MODEL,
        temperature: 0,
        max_tokens: 220,
        messages: [
          {
            role: "system",
            content: `Você extrai escolaridade em português do Brasil. Retorne somente JSON, sem markdown, com: reply, level, grade, education_status, year, city, school. Valores canônicos: level=fundamental|medio|null; education_status=completed|attending|stopped|null. Fundamental aceita 1-9; médio aceita 1-3; ano entre 1950 e ${CURRENT_YEAR + 1}. Não confunda concluir uma série com concluir todo o nível. Cidade e escola são opcionais e devem ser string vazia quando a pessoa não souber. Preserve dados anteriores não corrigidos. Se faltar dado obrigatório, reply deve fazer uma única pergunta curta. Se estiver completo, reply deve pedir conferência do resumo. Nunca invente dados.`,
          },
          {
            role: "user",
            content: JSON.stringify({ previous, history, message }),
          },
        ],
      },
      { signal: AbortSignal.timeout(8_000) },
    );

    const candidate = extractJson(completion.choices[0]?.message?.content ?? "");
    const hints = extractMessageHints(message);
    const has = (key: string) => Object.prototype.hasOwnProperty.call(candidate, key);
    const level = hints.level ?? previous.level ?? (has("level") ? normalizeLevel(candidate.level) : null);
    const grade = hints.grade ?? previous.grade ?? (has("grade") ? normalizeNumber(candidate.grade) : null);
    const educationStatus =
      hints.educationStatus ??
      previous.education_status ??
      (has("education_status") ? normalizeStatus(candidate.education_status) : null);
    const year = hints.year ?? previous.year ?? (has("year") ? normalizeNumber(candidate.year) : null);
    const city = has("city") ? normalizeOptional(candidate.city) : previous.city;
    const school = has("school") ? normalizeOptional(candidate.school) : previous.school;
    const ready =
      Boolean(level && educationStatus) &&
      validGrade(level, grade) &&
      Boolean(year && year >= 1950 && year <= CURRENT_YEAR + 1);
    const draft = {
      level,
      grade,
      education_status: educationStatus,
      year,
      city,
      school,
    };
    const reply = fallbackReply(draft);

    return NextResponse.json({ reply, ready, draft });
  } catch (error) {
    const timedOut =
      error instanceof Error && /abort|timeout/i.test(`${error.name} ${error.message}`);
    return NextResponse.json(
      {
        detail: timedOut
          ? "O assistente demorou mais que o esperado."
          : "Não foi possível entender a resposta agora.",
        code: timedOut ? "ASSISTANT_TIMEOUT" : "ASSISTANT_INVALID_RESPONSE",
      },
      { status: 502 },
    );
  }
}
