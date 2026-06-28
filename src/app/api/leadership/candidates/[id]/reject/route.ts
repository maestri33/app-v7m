/**
 * POST /api/leadership/candidates/[id]/reject — recusa o candidato com um motivo
 * (decisão L2, irreversível; a pessoa vê o motivo). Proxy do backend
 * `POST /api/v1/leadership/candidates/{external_id}/reject` com body RejectIn
 * `{ reason }`. djangoFetch injeta o Bearer do cookie HttpOnly.
 */
import { NextResponse } from "next/server";

import { djangoFetch, DjangoError } from "@/lib/api/client";
import { djangoErrorResponse } from "@/lib/api/django-error";
import { LEADERSHIP, type RejectIn } from "@/lib/api/leadership";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const raw = (await req.json().catch(() => ({}))) as Partial<RejectIn>;
    const reason = typeof raw.reason === "string" ? raw.reason.trim() : "";
    if (!reason) {
      return NextResponse.json(
        { detail: "Escreva o motivo da recusa.", code: "DESCRIPTION_REQUIRED" },
        { status: 422 },
      );
    }
    await djangoFetch(`${LEADERSHIP}/candidates/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason } satisfies RejectIn),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DjangoError) return djangoErrorResponse(err);
    return NextResponse.json(
      { detail: "Falha ao recusar o candidato.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}
