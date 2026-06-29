"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError } from "@/components/ui/field";
import type { HubPromoterRow, PendingMaterial } from "@/lib/api/leadership";

type ErrBody = { detail?: string; code?: string };

/** Promotor + as matérias obrigatórias em aberto (vindas do balde locked_promoters de /reviews). */
export type PromoterWithPending = HubPromoterRow & {
  pending_materials: PendingMaterial[];
};

/**
 * Roteia o erro por `switch(code)` (regra do monólito: nunca decidir parseando
 * `detail`). Códigos desconhecidos caem no `detail` do back (em pt-BR).
 */
function promoterMessage(body: ErrBody): string {
  switch (body.code) {
    case "PROMOTER_NOT_FOUND":
      return "Esse promotor não é (mais) do seu polo.";
    case "NOT_HUB_COORDINATOR":
      return "Você não coordena nenhum polo, então não dá pra operar promotores aqui.";
    case "FORBIDDEN_ROLE":
      return "Seu acesso não permite operar promotores.";
    case "MATERIAL_NOT_ASSIGNED":
    case "MATERIAL_NOT_FOUND":
      return "Essa matéria não está atribuída a este promotor (ou já foi resolvida).";
    case "WRONG_STATUS":
      return "O promotor não está na situação esperada pra essa ação. Atualize a página.";
    case "UNAUTHORIZED":
      return "Sua sessão expirou. Entre de novo pra continuar.";
    default:
      return body.detail || "Não deu pra concluir a ação agora. Tente de novo.";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Ativo";
    case "suspended":
      return "Suspenso";
    default:
      return status;
  }
}

/**
 * Lista de promotores do polo com ações inline. Cada ação que muda status/acesso
 * (suspender, reativar, aprovar matéria de quem está travado no treino) exige
 * confirmação explícita de 2 passos. Os POSTs vão pros route handlers em
 * /api/leadership/... que injetam o cookie HttpOnly.
 */
export function PromotoresList({ items }: { items: PromoterWithPending[] }) {
  const router = useRouter();
  // confirm key: `${id}:suspend` | `${id}:reactivate` | `${id}:material:${materialId}`
  const [confirming, setConfirming] = useState<string | null>(null);
  const [errorFor, setErrorFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function cancel() {
    setConfirming(null);
    setError(null);
    setErrorFor(null);
  }

  function run(key: string, req: Promise<Response>) {
    setError(null);
    setErrorFor(null);
    startTransition(async () => {
      try {
        const res = await req;
        if (!res.ok) {
          setError(promoterMessage(await res.json().catch(() => ({}))));
          setErrorFor(key);
          return;
        }
        setConfirming(null);
        router.refresh();
      } catch {
        setError("Falha de rede. Tente de novo.");
        setErrorFor(key);
      }
    });
  }

  function post(path: string) {
    return fetch(`/api/leadership/promoters${path}`, { method: "POST" });
  }

  return (
    <ul className="grid gap-4">
      {items.map((p) => {
        const suspended = p.status === "suspended";
        const suspendKey = `${p.external_id}:suspend`;
        const reactivateKey = `${p.external_id}:reactivate`;
        return (
          <li key={p.external_id}>
            <Card>
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-lg">{p.name ?? "Sem nome"}</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={suspended ? "danger" : "ok"}>
                    {statusLabel(p.status)}
                  </Badge>
                  {p.locked && <Badge tone="warn">Travado no treino</Badge>}
                </div>
              </div>

              {/* Suspender / Reativar */}
              <div className="mt-4">
                {suspended ? (
                  confirming === reactivateKey ? (
                    <div className="space-y-2">
                      <p className="text-sm text-brand-ink">
                        Reativar este promotor? Ele volta a captar e receber.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <Button
                          type="button"
                          onClick={() =>
                            run(reactivateKey, post(`/${p.external_id}/reactivate`))
                          }
                          loading={pending}
                        >
                          {pending ? "Reativando…" : "Confirmar reativação"}
                        </Button>
                        <Button type="button" variant="ghost" onClick={cancel} disabled={pending}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button type="button" onClick={() => setConfirming(reactivateKey)}>
                      Reativar
                    </Button>
                  )
                ) : confirming === suspendKey ? (
                  <div className="space-y-2">
                    <p className="text-sm text-brand-ink">
                      Suspender este promotor? Enquanto suspenso, ele não capta nem recebe.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        type="button"
                        onClick={() => run(suspendKey, post(`/${p.external_id}/suspend`))}
                        loading={pending}
                      >
                        {pending ? "Suspendendo…" : "Confirmar suspensão"}
                      </Button>
                      <Button type="button" variant="ghost" onClick={cancel} disabled={pending}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button type="button" variant="ghost" onClick={() => setConfirming(suspendKey)}>
                    Suspender
                  </Button>
                )}
              </div>

              {/* Matérias obrigatórias em aberto (destrava aprovando) */}
              {p.pending_materials.length > 0 && (
                <div className="mt-4 border-t border-brand-border pt-4">
                  <h3 className="text-sm font-medium text-brand-ink">
                    Matérias obrigatórias em aberto
                  </h3>
                  <p className="text-xs text-brand-muted mt-1">
                    Aprovar uma matéria destrava quem não tem prática digital pra
                    submeter a resposta.
                  </p>
                  <ul className="mt-3 grid gap-2">
                    {p.pending_materials.map((m) => {
                      const matKey = `${p.external_id}:material:${m.material_external_id}`;
                      return (
                        <li key={m.material_external_id} className="text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-brand-ink">{m.title}</span>
                            {confirming !== matKey && (
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setConfirming(matKey)}
                              >
                                Aprovar matéria
                              </Button>
                            )}
                          </div>
                          {confirming === matKey && (
                            <div className="mt-2 space-y-2">
                              <p className="text-brand-ink">
                                Aprovar esta matéria no lugar do promotor? Decisão final.
                              </p>
                              <div className="flex flex-wrap gap-3">
                                <Button
                                  type="button"
                                  onClick={() =>
                                    run(
                                      matKey,
                                      post(
                                        `/${p.external_id}/materials/${m.material_external_id}/approve`,
                                      ),
                                    )
                                  }
                                  loading={pending}
                                >
                                  {pending ? "Aprovando…" : "Confirmar aprovação"}
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={cancel}
                                  disabled={pending}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          )}
                          {errorFor === matKey && <FieldError>{error}</FieldError>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {(errorFor === suspendKey || errorFor === reactivateKey) && (
                <FieldError>{error}</FieldError>
              )}
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
