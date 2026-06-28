/**
 * POST /api/leadership/students/[id]/exam/grade — coordenador corrige a prova do
 * aluno (passou → conferência; reprovou → refazer). Decisão L2, afeta status real.
 * Proxy do backend `POST /api/v1/leadership/students/{external_id}/exam/grade` com
 * body `ExamGradeIn` `{ passed, notes? }`. djangoFetch injeta o Bearer do cookie
 * HttpOnly; o client nunca toca no token.
 */
import { NextResponse } from "next/server";

import { djangoFetch, DjangoError } from "@/lib/api/client";
import { djangoErrorResponse } from "@/lib/api/django-error";
import { LEADERSHIP, type ExamGradeIn } from "@/lib/api/leadership";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const raw = (await req.json().catch(() => ({}))) as Partial<ExamGradeIn>;
    if (typeof raw.passed !== "boolean") {
      return NextResponse.json(
        { detail: "Diga se o aluno passou ou não na prova.", code: "NO_FIELDS" },
        { status: 422 },
      );
    }
    const body: ExamGradeIn = {
      passed: raw.passed,
      ...(typeof raw.notes === "string" && raw.notes.trim()
        ? { notes: raw.notes.trim() }
        : {}),
    };
    const data = await djangoFetch(`${LEADERSHIP}/students/${id}/exam/grade`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof DjangoError) return djangoErrorResponse(err);
    return NextResponse.json(
      { detail: "Falha ao corrigir a prova.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}
