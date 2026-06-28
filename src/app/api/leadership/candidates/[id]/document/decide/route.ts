/**
 * POST /api/leadership/candidates/[id]/document/decide — decisão humana do
 * documento do candidato (decisão L2, afeta identidade). Proxy do backend
 * `POST /api/v1/leadership/candidates/{external_id}/document/decide` com body
 * `{ approve: boolean, reason?: string | null }`. O retorno é o `me_dict` do
 * candidato — mantemos como unknown e deixamos a UI refazer o GET do detalhe.
 * djangoFetch injeta o Bearer do cookie HttpOnly.
 */
import { NextResponse } from "next/server";

import { djangoFetch, DjangoError } from "@/lib/api/client";
import { djangoErrorResponse } from "@/lib/api/django-error";
import { LEADERSHIP, type DecideIn } from "@/lib/api/leadership";

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
        { detail: "Explique por que o documento foi recusado.", code: "DESCRIPTION_REQUIRED" },
        { status: 422 },
      );
    }
    const body: DecideIn = { approve, reason };
    await djangoFetch(`${LEADERSHIP}/candidates/${id}/document/decide`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DjangoError) return djangoErrorResponse(err);
    return NextResponse.json(
      { detail: "Falha ao decidir o documento.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}
