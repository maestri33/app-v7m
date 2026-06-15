/**
 * GET /api/me/training/materials — lista de matérias ativas (LMS).
 * Backend: `GET /api/v1/collaborators/training/materials` (role training).
 */
import { NextResponse } from "next/server";

import { djangoFetch, DjangoError } from "@/lib/api/client";
import { djangoErrorResponse } from "@/lib/api/django-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await djangoFetch("/api/v1/collaborators/training/materials");
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof DjangoError) return djangoErrorResponse(err);
    return NextResponse.json(
      { detail: "Falha ao listar matérias.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}
