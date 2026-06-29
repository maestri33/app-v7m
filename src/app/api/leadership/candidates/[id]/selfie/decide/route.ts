/**
 * POST /api/leadership/candidates/[id]/selfie/decide — decisão humana da selfie do
 * candidato (decisão L2, afeta identidade). Proxy do backend
 * `POST /api/v1/leadership/candidates/{external_id}/selfie/decide` com body
 * `{ approve: boolean, reason?: string | null }`. djangoFetch injeta o Bearer do
 * cookie HttpOnly; o client nunca toca no token.
 */
import { NextResponse } from "next/server";

import { djangoFetch, DjangoError } from "@/lib/api/client";
import { djangoErrorResponse } from "@/lib/api/django-error";
import { LEADERSHIP, type DecideIn, type CandidateSelfieDecide } from "@/lib/api/leadership";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const raw = (await req.json().catch(() => ({}))) as Partial<DecideIn>;
    const approve = raw.approve === true;
    const reason = typeof raw.reason === "string" ? raw.reason.trim() : null;
    if (!approve && !reason) {
      return NextResponse.json(
        { detail: "Explique por que a selfie foi recusada.", code: "DESCRIPTION_REQUIRED" },
        { status: 422 },
      );
    }
    const body: DecideIn = { approve, reason };
    const data = await djangoFetch<CandidateSelfieDecide>(
      `${LEADERSHIP}/candidates/${id}/selfie/decide`,
      { method: "POST", body: JSON.stringify(body) },
    );
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof DjangoError) return djangoErrorResponse(err);
    return NextResponse.json(
      { detail: "Falha ao decidir a selfie.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}
