/**
 * Modelo de roles do app unificado (candidato → promotor → coordenador).
 *
 * Regra do Victor (2026-06-23): **um login, um shell**, seções liberadas por
 * role. O `whoami`/JWT devolve TODAS as roles ativas (back: "emite JWT com
 * TODAS as roles ativas"). Aqui NÃO colapsamos pra uma role só — o erro do
 * antigo `pickFunnelRole`, que escolhia UMA e fazia coordinator+promoter virar
 * só promoter. Em vez disso separamos a lista em três eixos:
 *
 *  - **stage** (eixo 1, linear, do funil): candidate → promoter. É "onde a
 *    pessoa está" no onboarding. Pega-se o mais avançado.
 *  - **gate** (trava temporária que pode surgir a qualquer momento): `training`.
 *    Curso inicial OU atualização/recado obrigatório. Enquanto presente, tranca
 *    tudo no LMS. É a PRIORIDADE MÁXIMA (inverte o velho comportamento, em que
 *    `training` era a prioridade mais baixa e a tela de treino te expulsava).
 *  - **grant** (poder administrativo, aditivo, empilha por cima de promotor):
 *    `coordinator`. (`staff` fica pra outro app — aqui só roteia pra fora.)
 *
 * Funções PURAS sobre `string[]` — sem `server-only`, pra valer no server
 * (layout/guard) e no client (nav/seletor de contexto) igual.
 */

/** Roles conhecidas do funil/poderes. `staff` é reconhecida só pra rotear pra fora. */
export type Role = "candidate" | "training" | "promoter" | "coordinator" | "staff";

/** Áreas que o shell pode liberar conforme entitlement. */
export type Area = "onboarding" | "promoter" | "coordination";

/**
 * Trava de treinamento. Se `training` está nas roles, o ambiente de promotor
 * (e coordenação) fica BLOQUEADO — a pessoa só acessa o LMS até o back parar de
 * devolver `training`. Vale pro curso inicial e pra qualquer atualização/recado.
 */
export function isTrainingLocked(roles: string[]): boolean {
  return roles.includes("training");
}

/**
 * Onboarding do candidato: ainda é `candidate` e NÃO virou `promoter`. Enquanto
 * isso, vê só o wizard (perfil → endereço → documento → selfie → pix → análise).
 * Quem já é promoter não está mais em onboarding, mesmo que a flag candidate
 * sobreviva no back.
 */
export function isOnboarding(roles: string[]): boolean {
  return roles.includes("candidate") && !roles.includes("promoter");
}

/** Base de todo mundo que passou do funil: tem o painel/leads/comissões. */
export function isPromoter(roles: string[]): boolean {
  return roles.includes("promoter");
}

/** Poder de coordenação de polo/hub (aditivo — coordenador É também promotor). */
export function isCoordinator(roles: string[]): boolean {
  return roles.includes("coordinator");
}

/** Staff (admin geral) — fora deste app; usado só pra rotear pra fora com elegância. */
export function isStaff(roles: string[]): boolean {
  return roles.includes("staff");
}

/**
 * A pessoa pode acessar a área? Centraliza o gating do shell.
 *
 * Importante: `training` é trava DURA — quando ativa, nega `promoter` e
 * `coordination` (só o LMS passa, tratado fora daqui pelo guard que força
 * `/treinamento`). `onboarding` só existe enquanto candidato não é promotor.
 */
export function can(roles: string[], area: Area): boolean {
  if (area === "onboarding") return isOnboarding(roles);
  if (isTrainingLocked(roles)) return false; // trava: nada de promotor/coordenação
  if (area === "promoter") return isPromoter(roles) || isOnboarding(roles);
  if (area === "coordination") return isCoordinator(roles);
  return false;
}

/**
 * Para onde a pessoa aterrissa pós-login (role-router central). Ordem de
 * prioridade espelha os eixos: trava de treino → onboarding → shell normal.
 * `staff` puro (sem promoter/coordinator) cai no painel, que mostra o aviso de
 * "use o app de staff" — não derruba a sessão.
 */
export function landingFor(roles: string[]): string {
  if (isTrainingLocked(roles)) return "/treinamento";
  if (isOnboarding(roles)) return "/painel"; // painel renderiza a visão de wizard do candidato
  return "/painel";
}
