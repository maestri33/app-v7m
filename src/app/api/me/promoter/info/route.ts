/**
 * GET /api/me/promoter/info — dados do promotor (status, ref_url, pix, hub).
 * Backend: `GET /api/v1/collaborators/promoter/me` (role promoter).
 */
import { NextResponse } from "next/server";

import { djangoFetch, DjangoError } from "@/lib/api/client";
import { djangoErrorResponse } from "@/lib/api/django-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await djangoFetch("/api/v1/collaborators/promoter/me");
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof DjangoError) return djangoErrorResponse(err);
    return NextResponse.json(
      { detail: "Falha ao carregar o promotor.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}
