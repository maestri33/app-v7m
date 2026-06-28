/**
 * POST /api/me/documents — registra o tipo (rg|cnh) + número + meta. Devolve `me_dict`.
 * Backend: `POST /api/v1/collaborators/candidate/documents`.
 */
import { NextResponse } from "next/server";

import { djangoFetch, DjangoError } from "@/lib/api/client";
import { djangoErrorResponse } from "@/lib/api/django-error";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const me = await djangoFetch("/api/v1/collaborators/candidate/documents", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return NextResponse.json(me);
  } catch (err) {
    if (err instanceof DjangoError) return djangoErrorResponse(err);
    return NextResponse.json(
      { detail: "Falha ao registrar o documento.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}
