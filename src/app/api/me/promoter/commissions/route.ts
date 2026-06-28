/**
 * GET /api/me/promoter/commissions — comissões do promotor.
 * Backend: `GET /api/v1/collaborators/promoter/me/commissions` (role promoter).
 */
import { NextResponse } from "next/server";

import { djangoFetch, DjangoError } from "@/lib/api/client";
import { djangoErrorResponse } from "@/lib/api/django-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await djangoFetch("/api/v1/collaborators/promoter/me/commissions");
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof DjangoError) return djangoErrorResponse(err);
    return NextResponse.json(
      { detail: "Falha ao listar as comissões.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}
