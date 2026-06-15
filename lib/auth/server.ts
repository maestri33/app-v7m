/**
 * Auth server-side: lê o cookie `v7m_access` e devolve a sessão
 * (ou `null` se não autenticado / token expirado).
 *
 * O JWT é **opaco** pro front — quem valida é o Django. O Next só repassa.
 */
import "server-only";

import { cookies } from "next/headers";

import { djangoFetch } from "@/lib/api/client";

export type Session = {
  external_id: string;
  roles: string[];
  name: string | null;
};

const CANDIDATE_FUNNEL_ROLES = ["coordinator", "promoter", "training", "candidate"] as const;

/** Lê o cookie; se houver, consulta o whoami do Django. */
export async function readSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const access = cookieStore.get("v7m_access")?.value;
  if (!access) return null;

  try {
    return await djangoFetch<Session>("/api/v1/collaborators/whoami");
  } catch {
    return null;
  }
}

/** Role mais avançada do funil do colaborador (do mais pro menos). */
export function pickFunnelRole(roles: string[]): string | null {
  for (const r of CANDIDATE_FUNNEL_ROLES) {
    if (roles.includes(r)) return r;
  }
  return null;
}
