/** POST /api/leadership/auth/login — login do coordenador (OTP → JWT em contexto coordenador). */
import { NextResponse } from "next/server";

import { djangoFetch } from "@/lib/api/client";
import { djangoErrorResponse } from "@/lib/api/django-error";
import { setAuthCookies } from "@/lib/auth/cookies";

export const dynamic = "force-dynamic";

type LoginResponse = { access_token: string; refresh_token: string; token_type?: string };

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const data = await djangoFetch<LoginResponse>("/api/v1/leadership/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
      authenticated: false,
    });
    await setAuthCookies(data.access_token, data.refresh_token);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return djangoErrorResponse(err);
  }
}
