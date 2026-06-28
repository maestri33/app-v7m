/**
 * POST /api/leadership/pendencies/[id]/resolve — coordenador resolve uma pendência
 * do aluno; sem pendência aberta o aluno segue pro diploma. Decisão L2, afeta
 * status real. Proxy do backend `POST /api/v1/leadership/pendencies/{external_id}/resolve`
 * (sem body — o id é o da pendência, não do aluno). djangoFetch injeta o Bearer
 * do cookie HttpOnly; o client nunca toca no token.
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
    const data = await djangoFetch(`${LEADERSHIP}/pendencies/${id}/resolve`, {
      method: "POST",
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof DjangoError) return djangoErrorResponse(err);
    return NextResponse.json(
      { detail: "Falha ao resolver a pendência.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}
