/**
 * POST /api/leadership/candidates/[id]/approve — promove o candidato a promotor e
 * atribui o treinamento obrigatório (decisão L2, irreversível). Proxy do backend
 * `POST /api/v1/leadership/candidates/{external_id}/approve` (sem body). O
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
    await djangoFetch(`${LEADERSHIP}/candidates/${id}/approve`, { method: "POST" });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DjangoError) return djangoErrorResponse(err);
    return NextResponse.json(
      { detail: "Falha ao aprovar o candidato.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}
