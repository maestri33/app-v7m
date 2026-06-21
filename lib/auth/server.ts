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

// Ordem de prioridade no app-promotor: `promoter` ACIMA de `coordinator` (Victor 2026-06-16).
// Quem acumula coordinator+promoter abre ESTE app como promotor (o coordenador tem app próprio,
// grupo `leadership`). Sem isso, a conta-mãe (coordinator) caía no branch default do /painel e
// não via o dashboard de promotor. Ver tests/fe-painel/m4-painel-promotor.md (achado M4-1).
const CANDIDATE_FUNNEL_ROLES = ["promoter", "coordinator", "training", "candidate"] as const;

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

/**
 * Sessão da área `leadership`: lê o cookie e consulta o whoami do sub-router do
 * coordenador. Só conta como sessão válida se a conta tiver a role `coordinator`
 * (o gate duro — coordenar um Hub — o back impõe no login e nos endpoints de
 * dados via `require_roles` + `_coordinator_hub`; aqui só conferimos a role).
 */
export async function readLeadershipSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const access = cookieStore.get("v7m_access")?.value;
  if (!access) return null;

  try {
    const me = await djangoFetch<Session>("/api/v1/leadership/whoami");
    if (!me.roles?.includes("coordinator")) return null;
    return me;
  } catch {
    return null;
  }
}
