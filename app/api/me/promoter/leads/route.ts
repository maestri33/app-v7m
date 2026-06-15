/**
 * GET /api/me/promoter/leads — leads atribuídos a este promotor.
 * Backend: `GET /api/v1/collaborators/promoter/me/leads` (role promoter).
 */
import { NextResponse } from "next/server";

import { djangoFetch, DjangoError } from "@/lib/api/client";
import { djangoErrorResponse } from "@/lib/api/django-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await djangoFetch("/api/v1/collaborators/promoter/me/leads");
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof DjangoError) return djangoErrorResponse(err);
    return NextResponse.json(
      { detail: "Falha ao listar os leads.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}
