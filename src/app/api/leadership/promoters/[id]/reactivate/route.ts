/**
 * POST /api/leadership/promoters/[id]/reactivate — coordenador reativa um promotor
 * SUSPENSO do polo (volta a captar). Decisão L2, afeta status/acesso real.
 * `id` = external_id do User-promotor. Proxy do backend
 * `POST /api/v1/leadership/promoters/{external_id}/reactivate` (sem body).
 * djangoFetch injeta o Bearer do cookie HttpOnly; o client nunca toca no token.
 */
import { NextResponse } from "next/server";

import { djangoFetch, DjangoError } from "@/lib/api/client";
import { djangoErrorResponse } from "@/lib/api/django-error";
import { LEADERSHIP, type HubPromoterRow } from "@/lib/api/leadership";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const data = await djangoFetch<HubPromoterRow>(
      `${LEADERSHIP}/promoters/${id}/reactivate`,
      { method: "POST" },
    );
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof DjangoError) return djangoErrorResponse(err);
    return NextResponse.json(
      { detail: "Falha ao reativar o promotor.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}
