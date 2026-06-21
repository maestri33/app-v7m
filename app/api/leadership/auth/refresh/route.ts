/** POST /api/leadership/auth/refresh — rotaciona o par do coordenador (lê refresh do cookie). */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { djangoFetch, DjangoError } from "@/lib/api/client";
import { djangoErrorResponse } from "@/lib/api/django-error";
import { REFRESH_COOKIE, clearAuthCookies, setAuthCookies } from "@/lib/auth/cookies";

export const dynamic = "force-dynamic";

type RefreshResponse = { access_token: string; refresh_token: string };

export async function POST() {
  const cookieStore = await cookies();
  const refresh = cookieStore.get(REFRESH_COOKIE)?.value;
  if (!refresh) {
    return NextResponse.json(
      { detail: "Sessão expirada — faça login novamente.", code: "SESSION_EXPIRED" },
      { status: 401 },
    );
  }
  try {
    const data = await djangoFetch<RefreshResponse>("/api/v1/leadership/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refresh }),
      authenticated: false,
    });
    await setAuthCookies(data.access_token, data.refresh_token);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DjangoError) {
      await clearAuthCookies();
    }
    return djangoErrorResponse(err);
  }
}
