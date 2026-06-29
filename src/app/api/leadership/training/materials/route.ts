/**
 * GET/POST /api/leadership/training/materials — autoria de matéria do treino pelo
 * coordenador (mesmo contrato do staff). GET lista TODAS as matérias com gabarito
 * (visão de autoria); POST cria uma nova. Decisão L2 (não mexe em dinheiro/
 * identidade, mas define o que trava o painel dos promotores). Proxy do backend
 * `GET/POST /api/v1/leadership/training/materials`. djangoFetch injeta o Bearer do
 * cookie HttpOnly; o client nunca toca no token.
 */
import { NextResponse } from "next/server";

import { djangoFetch, DjangoError } from "@/lib/api/client";
import { djangoErrorResponse } from "@/lib/api/django-error";
import {
  LEADERSHIP,
  type Material,
  type MaterialCreateIn,
} from "@/lib/api/leadership";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await djangoFetch<Material[]>(`${LEADERSHIP}/training/materials`);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof DjangoError) return djangoErrorResponse(err);
    return NextResponse.json(
      { detail: "Falha ao carregar as matérias.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const raw = (await req.json().catch(() => ({}))) as Partial<MaterialCreateIn>;
    const title = typeof raw.title === "string" ? raw.title.trim() : "";
    const question = typeof raw.question === "string" ? raw.question.trim() : "";
    const expected_answer =
      typeof raw.expected_answer === "string" ? raw.expected_answer.trim() : "";
    if (!title || !question || !expected_answer) {
      return NextResponse.json(
        {
          detail: "Preencha título, questão e gabarito da matéria.",
          code: "DESCRIPTION_REQUIRED",
        },
        { status: 422 },
      );
    }
    const body: MaterialCreateIn = {
      title,
      question,
      expected_answer,
      text_content:
        typeof raw.text_content === "string" ? raw.text_content : "",
      ...(typeof raw.kind === "string" ? { kind: raw.kind } : {}),
      ...(typeof raw.blocking === "boolean" ? { blocking: raw.blocking } : {}),
      ...(typeof raw.order === "number" ? { order: raw.order } : {}),
    };
    const data = await djangoFetch<Material>(`${LEADERSHIP}/training/materials`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof DjangoError) return djangoErrorResponse(err);
    return NextResponse.json(
      { detail: "Falha ao criar a matéria.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}
