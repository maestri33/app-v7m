/**
 * POST /api/leadership/enrollments/[id]/conclude — promotor promove enrollment →
 * student após obter login/senha na plataforma parceira e colar aqui. O back
 * exige ambas as parcelas (1ª PAGA + 2ª AGENDADA), senão `FEES_INCOMPLETE` (409).
 * **Mexe em identidade real** (login do aluno na instituição parceira + invalida
 * o JWT antigo do usuário via `token_version`). Proxy do backend
 * `POST /api/v1/leadership/enrollments/{external_id}/conclude` com body
 * `ConcludeIn` `{ platform_login, platform_password, platform_url?, platform_notes? }`.
 */
import { NextResponse } from "next/server";

import { djangoFetch, DjangoError } from "@/lib/api/client";
import { djangoErrorResponse } from "@/lib/api/django-error";
import {
  LEADERSHIP,
  type ConcludeIn,
  type EnrollmentAction,
} from "@/lib/api/leadership";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const raw = (await req.json().catch(() => ({}))) as Partial<ConcludeIn>;
    const platform_login = typeof raw.platform_login === "string" ? raw.platform_login.trim() : "";
    const platform_password =
      typeof raw.platform_password === "string" ? raw.platform_password : "";
    if (!platform_login || !platform_password) {
      return NextResponse.json(
        {
          detail: "Cole o login e a senha que você pegou na plataforma parceira.",
          code: "DESCRIPTION_REQUIRED",
        },
        { status: 422 },
      );
    }
    const body: ConcludeIn = {
      platform_login,
      platform_password,
      ...(typeof raw.platform_url === "string" && raw.platform_url.trim()
        ? { platform_url: raw.platform_url.trim() }
        : {}),
      ...(typeof raw.platform_notes === "string" && raw.platform_notes.trim()
        ? { platform_notes: raw.platform_notes.trim() }
        : {}),
    };
    const data = await djangoFetch<EnrollmentAction>(
      `${LEADERSHIP}/enrollments/${id}/conclude`,
      { method: "POST", body: JSON.stringify(body) },
    );
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof DjangoError) return djangoErrorResponse(err);
    return NextResponse.json(
      { detail: "Falha ao concluir a matrícula.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}