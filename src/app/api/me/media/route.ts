/**
 * GET /api/me/media?src=<url> — serve mídia do backend pela MESMA origem do app.
 *
 * Por que existe: a CSP do app é `img-src 'self'` (e `default-src 'self'` cobre
 * `<video>`), então foto de selfie e mídia das aulas — que vêm com URL absoluta
 * do backend — eram bloqueadas pelo browser. Além disso o cookie de sessão é
 * HttpOnly e do domínio do APP, então o browser nunca conseguiria autenticar
 * direto no backend. Este proxy resolve os dois: o Next busca com o Bearer do
 * cookie (mesmo padrão do `lib/api/client.ts`) e devolve pela própria origem.
 *
 * Guarda anti-SSRF: só passa URL cuja origem seja a do `BACKEND_URL` (caminho
 * relativo também vale, resolvido contra ele) e só content-type de mídia.
 */
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { BACKEND_URL } from "@/lib/api/config";
import { ACCESS_COOKIE } from "@/lib/auth/cookies";

export const dynamic = "force-dynamic";

/** Tipos que este proxy aceita repassar (nada de HTML/JSON vindo de fora). */
const ALLOWED_TYPE = /^(image\/|video\/|audio\/|application\/pdf\b)/i;

function badRequest(detail: string, code: string, status = 400) {
  return NextResponse.json({ detail, code }, { status });
}

export async function GET(req: Request) {
  const src = new URL(req.url).searchParams.get("src");
  if (!src) return badRequest("Parâmetro 'src' ausente.", "MEDIA_SRC_MISSING");

  let target: URL;
  try {
    // Aceita absoluta OU relativa (o backend pode devolver "/media/x.jpg").
    target = new URL(src, BACKEND_URL);
  } catch {
    return badRequest("Endereço de mídia inválido.", "MEDIA_SRC_INVALID");
  }

  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return badRequest("Endereço de mídia inválido.", "MEDIA_SRC_INVALID");
  }
  if (target.origin !== new URL(BACKEND_URL).origin) {
    return badRequest("Origem de mídia não permitida.", "MEDIA_ORIGIN_BLOCKED", 403);
  }

  const access = (await cookies()).get(ACCESS_COOKIE)?.value;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      headers: access ? { Authorization: `Bearer ${access}` } : {},
      cache: "no-store",
    });
  } catch {
    return badRequest("Não foi possível carregar a mídia.", "MEDIA_UNREACHABLE", 502);
  }

  if (!upstream.ok || !upstream.body) {
    const status = upstream.status === 404 ? 404 : 502;
    return badRequest("Não foi possível carregar a mídia.", "MEDIA_UNAVAILABLE", status);
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  if (!ALLOWED_TYPE.test(contentType)) {
    return badRequest("Conteúdo não é mídia.", "MEDIA_TYPE_INVALID", 415);
  }

  const headers = new Headers({
    "Content-Type": contentType,
    // Resposta autenticada: nunca em cache compartilhado.
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });
  const length = upstream.headers.get("content-length");
  if (length) headers.set("Content-Length", length);

  return new NextResponse(upstream.body, { status: 200, headers });
}
