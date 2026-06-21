/** POST /api/leadership/auth/check — proxy fino do Django (área coordenador). */
import { NextResponse } from "next/server";

import { djangoFetch } from "@/lib/api/client";
import { djangoErrorResponse } from "@/lib/api/django-error";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const data = await djangoFetch("/api/v1/leadership/auth/check", {
      method: "POST",
      body: JSON.stringify(body),
      authenticated: false,
    });
    return NextResponse.json(data);
  } catch (err) {
    return djangoErrorResponse(err);
  }
}
