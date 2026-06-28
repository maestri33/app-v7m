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
  readonly code?: string;
  readonly extra?: Record<string, unknown>;

  constructor(
    public status: number,
    public body: { detail: string; code: string; [k: string]: unknown },
  ) {
    super(`Django ${status} ${body.code}: ${String(body.detail)}`);
    this.code = body.code;
    this.extra = body as Record<string, unknown>;
  }
}

/** Mensagem de erro amigável para a UI. Régua do app dos alunos: mapeia status,
 *  códigos conhecidos e abort de rede — nunca expõe o stack bruto. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof DjangoError) {
    switch (error.code) {
      case "UNAUTHORIZED":
        return "Sessão expirada. Entre novamente.";
      case "OTP_INVALID":
      case "OTP_EXPIRED":
        return "Código inválido ou expirado. Solicite outro.";
      case "NOT_FOUND":
      case "CANDIDATE_NOT_FOUND":
        return "Não encontrado.";
      case "FORBIDDEN_ROLE":
      case "NOT_HUB_COORDINATOR":
        return "Você não tem permissão para isso.";
      case "DESCRIPTION_REQUIRED":
        return "Preencha o motivo obrigatório.";
      default:
        return error.body.detail ?? "Não deu pra completar agora. Tente de novo.";
    }
  }
  if (error instanceof Error && error.name === "AbortError") {
    return "Tempo esgotado. Verifique sua conexão e tente novamente.";
  }
  return "Não foi possível conectar. Verifique sua conexão e tente novamente.";
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
