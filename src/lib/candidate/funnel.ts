/**
 * Funil do candidato (ordem do backend) — helpers compartilhados entre o painel
 * e as páginas de etapa. O wizard é auto-avançante: concluir uma etapa navega
 * direto pra próxima, nunca volta pra um hub de cards.
 */
import type { CandidateStatus } from "@/lib/api/types";

/** Ordem do funil (mesma do backend). `status` nomeia a PRÓXIMA etapa a fazer. */
export const FUNNEL_ORDER: CandidateStatus[] = [
  "started",
  "profile",
  "address",
  "documents",
  "pix",
  "selfie",
  "completed",
];

/** Página da etapa atual — pra onde o painel manda o candidato direto. */
export const STAGE_HREF: Record<CandidateStatus, string> = {
  started: "/perfil",
  profile: "/perfil",
  address: "/endereco",
  documents: "/documento",
  pix: "/pix",
  selfie: "/selfie",
  completed: "/painel",
};

/** Próximo passo depois de concluir cada etapa (navegação direta dos forms). */
export const NEXT_STAGE: Record<string, string> = {
  profile: "/endereco",
  address: "/documento",
  documents: "/pix",
  pix: "/selfie",
  selfie: "/painel",
};

/**
 * A etapa `stage` já foi concluída pra quem está em `current`? Usado pra travar
 * etapas preenchidas em resumo somente-leitura (só reabre se o back reprovar).
 */
export function stagePassed(stage: CandidateStatus, current: CandidateStatus): boolean {
  return FUNNEL_ORDER.indexOf(current) > FUNNEL_ORDER.indexOf(stage);
}

/**
 * `WRONG_STATUS` (409): a etapa desta tela não é a atual do funil (aba velha /
 * fora de ordem). Em vez de mostrar erro, os forms navegam pra etapa que o
 * backend espera (`expected_status` vem no envelope do erro).
 */
export function wrongStatusHref(
  code: string | undefined,
  expectedStatus: string | undefined,
): string | null {
  if (code !== "WRONG_STATUS") return null;
  return STAGE_HREF[expectedStatus as CandidateStatus] ?? "/painel";
}
