/**
 * GET /api/me/training/progress — resumo (total/respondidas/nota média/pendentes).
 * Backend: `GET /api/v1/collaborators/training/progress`.
 */
import { NextResponse } from "next/server";

import { djangoFetch, DjangoError } from "@/lib/api/client";
import { djangoErrorResponse } from "@/lib/api/django-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await djangoFetch("/api/v1/collaborators/training/progress");
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof DjangoError) return djangoErrorResponse(err);
    return NextResponse.json(
      { detail: "Falha ao carregar o progresso.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}
