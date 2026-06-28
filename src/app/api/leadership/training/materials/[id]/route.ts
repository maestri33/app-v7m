/**
 * PUT /api/leadership/training/materials/[id] — edita uma matéria do treino (só os
 * campos enviados; `active=false` desativa). Mesmo contrato do staff. Proxy do
 * backend `PUT /api/v1/leadership/training/materials/{external_id}` com body
 * `MaterialUpdateIn`. djangoFetch injeta o Bearer do cookie HttpOnly; o client
 * nunca toca no token.
 */
import { NextResponse } from "next/server";

import { djangoFetch, DjangoError } from "@/lib/api/client";
import { djangoErrorResponse } from "@/lib/api/django-error";
import {
  LEADERSHIP,
  type Material,
  type MaterialUpdateIn,
} from "@/lib/api/leadership";

export const dynamic = "force-dynamic";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const raw = (await req.json().catch(() => ({}))) as Partial<MaterialUpdateIn>;
    const body: MaterialUpdateIn = {};
    if (typeof raw.title === "string") body.title = raw.title.trim();
    if (typeof raw.question === "string") body.question = raw.question.trim();
    if (typeof raw.expected_answer === "string")
      body.expected_answer = raw.expected_answer.trim();
    if (typeof raw.text_content === "string") body.text_content = raw.text_content;
    if (typeof raw.kind === "string") body.kind = raw.kind;
    if (typeof raw.blocking === "boolean") body.blocking = raw.blocking;
    if (typeof raw.active === "boolean") body.active = raw.active;
    if (typeof raw.order === "number") body.order = raw.order;

    if (Object.keys(body).length === 0) {
      return NextResponse.json(
        { detail: "Nada para atualizar.", code: "NO_FIELDS" },
        { status: 422 },
      );
    }
    const data = await djangoFetch<Material>(
      `${LEADERSHIP}/training/materials/${id}`,
      { method: "PUT", body: JSON.stringify(body) },
    );
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof DjangoError) return djangoErrorResponse(err);
    return NextResponse.json(
      { detail: "Falha ao atualizar a matéria.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}
