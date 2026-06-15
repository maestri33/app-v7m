/**
 * Cliente HTTP server-side pro Django. Lê o access token do cookie `v7m_access`
 * e injeta como Bearer. **NUNCA** exposto ao client.
 *
 * Erros do Django saem como `{detail, code, …extra}` (CONVENTION §3 / api/base.py).
 * Aqui só repassamos — quem decide o status é o Django.
 */
import "server-only";

import { cookies } from "next/headers";

import { BACKEND_URL } from "./config";

export type DjangoFetchOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
  /** Quando true, repassa o `Authorization: Bearer <access_token>` do cookie. Default: true. */
  authenticated?: boolean;
};

export class DjangoError extends Error {
  constructor(
    public status: number,
    public body: { detail: string; code: string; [k: string]: unknown },
  ) {
    super(`Django ${status} ${body.code}: ${String(body.detail)}`);
  }
}

export async function djangoFetch<T = unknown>(
  path: string,
  opts: DjangoFetchOptions = {},
): Promise<T> {
  const { authenticated = true, headers: extraHeaders, ...rest } = opts;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(extraHeaders ?? {}),
  };
  if (rest.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (authenticated) {
    const cookieStore = await cookies();
    const access = cookieStore.get("v7m_access")?.value;
    if (access) headers.Authorization = `Bearer ${access}`;
  }

  const res = await fetch(`${BACKEND_URL}${path}`, { ...rest, headers, cache: "no-store" });
  const text = await res.text();
  const body: unknown = text ? safeJson(text) : null;

  if (!res.ok) {
    const errBody =
      isErrorBody(body) ? body : { detail: res.statusText, code: "ERROR" };
    throw new DjangoError(res.status, errBody);
  }
  return body as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isErrorBody(x: unknown): x is { detail: string; code: string; [k: string]: unknown } {
  return (
    typeof x === "object" &&
    x !== null &&
    "detail" in x &&
    "code" in x
  );
}
