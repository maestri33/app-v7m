/**
 * POST /api/leadership/students/[id]/diploma/issue — coordenador emite o diploma
 * (certificado + histórico) → aluno fica AGUARDANDO RETIRADA. Decisão L2,
 * irreversível, afeta status real. Proxy do backend
 * `POST /api/v1/leadership/students/{external_id}/diploma/issue` (sem body).
 * djangoFetch injeta o Bearer do cookie HttpOnly; o client nunca toca no token.
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
    const data = await djangoFetch(
      `${LEADERSHIP}/students/${id}/diploma/issue`,
      { method: "POST" },
    );
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof DjangoError) return djangoErrorResponse(err);
    return NextResponse.json(
      { detail: "Falha ao emitir o diploma.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}
