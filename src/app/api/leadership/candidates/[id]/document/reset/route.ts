/**
 * POST /api/leadership/candidates/[id]/document/reset — volta o candidato para a
 * etapa de documento, limpando o doc_type fixado errado. Mantém perfil, endereço
 * e Pix. Proxy do backend `POST /api/v1/leadership/candidates/{external_id}/document/reset`
 * (sem body). djangoFetch injeta o Bearer do cookie HttpOnly.
 */
import { NextResponse } from "next/server";

import { djangoFetch, DjangoError } from "@/lib/api/client";
import { djangoErrorResponse } from "@/lib/api/django-error";
import { LEADERSHIP } from "@/lib/api/leadership";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await djangoFetch(`${LEADERSHIP}/candidates/${id}/document/reset`, { method: "POST" });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DjangoError) return djangoErrorResponse(err);
    return NextResponse.json(
      { detail: "Falha ao resetar a etapa de documento.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}
