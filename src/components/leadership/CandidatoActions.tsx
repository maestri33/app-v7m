"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError } from "@/components/ui/field";
import type { CandidateDetail } from "@/lib/api/leadership";

type ActionType = "approve" | "reject" | "selfie" | "document" | "document-reset";
type ErrBody = { detail?: string; code?: string };

/**
 * Roteia o erro da decisão por `switch(code)` (regra do monólito: nunca decidir
 * parseando `detail`). Códigos desconhecidos caem no `detail` do back (em pt-BR).
 */
function decisionMessage(body: ErrBody): string {
  switch (body.code) {
    case "CANDIDATE_NOT_FOUND":
      return "Esse candidato não é (mais) do seu polo — pode já ter saído da fila.";
    case "NOT_HUB_COORDINATOR":
      return "Você não coordena nenhum polo, então não dá pra decidir aqui.";
    case "FORBIDDEN_ROLE":
      return "Seu acesso não permite decidir candidatos.";
    case "ALREADY_APPROVED":
      return "Esse candidato já tinha sido aprovado.";
    case "SELFIE_NOT_IN_REVIEW":
      return "A selfie não está em revisão — talvez já tenha sido decidida.";
    case "DOC_NOT_IN_REVIEW":
      return "O documento não está em revisão — talvez já tenha sido decidido.";
    case "DOC_TYPE_LOCKED":
      return "O tipo do documento está travado; use resetar documento se quiser recomeçar.";
    case "DESCRIPTION_REQUIRED":
    case "NO_FIELDS":
      return "Escreva o motivo da recusa — a pessoa vai ler.";
    case "UNAUTHORIZED":
      return "Sua sessão expirou. Entre de novo pra continuar.";
    default:
      return body.detail || "Não deu pra concluir a ação agora. Tente de novo.";
  }
}

/**
 * Ações L2 do detalhe do candidato: aprovar/rejeitar (identidade/status real),
 * decidir selfie, decidir/resetar documento. Cada ação irreversível exige confirmação
 * explícita. Os POSTs vão pros route handlers em /api/leadership/... que injetam o
 * cookie HttpOnly.
 */
export function CandidatoActions({
  externalId,
  detail,
}: {
  externalId: string;
  detail: CandidateDetail | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<ActionType | "idle">("idle");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function idle() {
    setMode("idle");
    setReason("");
    setError(null);
  }

  function done() {
    router.refresh();
    idle();
  }

  function start(action: ActionType) {
    setError(null);
    setMode(action);
    setReason("");
  }

  function post(path: string, body?: object) {
    return fetch(`/api/leadership/candidates/${externalId}${path}`, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  function withReason(action: ActionType, r: string) {
    if (!r.trim()) {
      setError("Escreva o motivo da recusa — a pessoa vai ler.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const res = await post(
          action === "selfie" ? "/selfie/decide" : "/document/decide",
          {
            approve: false,
            reason: r.trim(),
          },
        );
        if (!res.ok) {
          setError(decisionMessage(await res.json().catch(() => ({}))));
          return;
        }
        done();
      } catch {
        setError("Falha de rede. Tente de novo.");
      }
    });
  }

  function approve(action: ActionType) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await post(
          action === "selfie" ? "/selfie/decide" : "/document/decide",
          { approve: true },
        );
        if (!res.ok) {
          setError(decisionMessage(await res.json().catch(() => ({}))));
          return;
        }
        done();
      } catch {
        setError("Falha de rede. Tente de novo.");
      }
    });
  }

  function approveCandidate() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await post("/approve");
        if (!res.ok) {
          setError(decisionMessage(await res.json().catch(() => ({}))));
          return;
        }
        // Aprovado vira promoter: sai da fila de candidatos → volta pra fila.
        router.push("/coordenador/candidatos");
        router.refresh();
      } catch {
        setError("Falha de rede. Tente de novo.");
      }
    });
  }

  function rejectCandidate() {
    const r = reason.trim();
    if (!r) {
      setError("Escreva o motivo da recusa — a pessoa vai ler.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const res = await post("/reject", { reason: r });
        if (!res.ok) {
          setError(decisionMessage(await res.json().catch(() => ({}))));
          return;
        }
        router.push("/coordenador/candidatos");
        router.refresh();
      } catch {
        setError("Falha de rede. Tente de novo.");
      }
    });
  }

  function resetDocument() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await post("/document/reset");
        if (!res.ok) {
          setError(decisionMessage(await res.json().catch(() => ({}))));
          return;
        }
        done();
      } catch {
        setError("Falha de rede. Tente de novo.");
      }
    });
  }

  const showSelfieActions = detail && detail.selfie_status !== "approved";

  return (
    <div className="grid gap-4 max-w-2xl">
      {/* Aprovar / Rejeitar candidato */}
      <Card>
        <h2 className="font-display text-base">Decisão do candidato</h2>
        <p className="text-sm text-brand-muted mt-1">
          Aprovar promove a pessoa a promotor e já atribui o treinamento obrigatório.
          Recusar exige um motivo, que a pessoa vai ver. As duas ações mexem em
          identidade e status reais.
        </p>

        {mode !== "approve" && mode !== "reject" && (
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="button" onClick={() => start("approve")}>Aprovar</Button>
            <Button type="button" variant="ghost" onClick={() => start("reject")}>
              Recusar
            </Button>
          </div>
        )}

        {mode === "approve" && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-brand-ink">
              Confirmar a aprovação? Isso promove a pessoa a promotor na hora.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={approveCandidate} loading={pending}>
                {pending ? "Aprovando…" : "Confirmar aprovação"}
              </Button>
              <Button type="button" variant="ghost" onClick={idle} disabled={pending}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {mode === "reject" && (
          <div className="mt-4 space-y-3">
            <label htmlFor="reject-reason" className="block text-sm text-brand-ink">
              Motivo da recusa
            </label>
            <textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Explique o que impediu a aprovação. A pessoa vai ler."
              className="w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-gold-ink/40"
            />
            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={rejectCandidate} loading={pending}>
                {pending ? "Recusando…" : "Confirmar recusa"}
              </Button>
              <Button type="button" variant="ghost" onClick={idle} disabled={pending}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <FieldError>{error}</FieldError>
      </Card>

      {/* Decidir selfie */}
      {showSelfieActions && (
        <Card>
          <h2 className="font-display text-base">Selfie</h2>
          <p className="text-sm text-brand-muted mt-1">
            Status atual: <strong>{detail?.selfie_status}</strong>. Aprovar ou recusar a
            selfie só faz sentido enquanto ela estiver em revisão.
          </p>

          {mode !== "selfie" && (
            <div className="mt-4 flex flex-wrap gap-3">
              <Button type="button" onClick={() => start("selfie")}>
                Decidir selfie
              </Button>
            </div>
          )}

          {mode === "selfie" && (
            <div className="mt-4 space-y-3">
              <label htmlFor="selfie-reason" className="block text-sm text-brand-ink">
                Motivo (obrigatório ao recusar)
              </label>
              <textarea
                id="selfie-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Ex: rosto coberto, foto borrada, pessoa diferente do documento..."
                className="w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-gold-ink/40"
              />
              <div className="flex flex-wrap gap-3">
                <Button type="button" onClick={() => approve("selfie")} loading={pending}>
                  {pending ? "Aprovando…" : "Aprovar selfie"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => withReason("selfie", reason)}
                  loading={pending}
                >
                  {pending ? "Recusando…" : "Recusar selfie"}
                </Button>
                <Button type="button" variant="ghost" onClick={idle} disabled={pending}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          <FieldError>{error}</FieldError>
        </Card>
      )}

      {/* Decidir / resetar documento */}
      <Card>
        <h2 className="font-display text-base">Documento</h2>
        <p className="text-sm text-brand-muted mt-1">
          Decidir o documento (aprovar/reprovar) ou resetar a etapa de documento (a
          pessoa volta a preencher/enviar). Documento e selfie são revisados pelo back.
        </p>

        {mode !== "document" && mode !== "document-reset" && (
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="button" onClick={() => start("document")}>
              Decidir documento
            </Button>
            <Button type="button" variant="ghost" onClick={() => start("document-reset")}>
              Resetar documento
            </Button>
          </div>
        )}

        {mode === "document" && (
          <div className="mt-4 space-y-3">
            <label htmlFor="doc-reason" className="block text-sm text-brand-ink">
              Motivo (obrigatório ao recusar)
            </label>
            <textarea
              id="doc-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Ex: documento ilegível, dados não conferem, foto cortada..."
              className="w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-gold-ink/40"
            />
            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={() => approve("document")} loading={pending}>
                {pending ? "Aprovando…" : "Aprovar documento"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => withReason("document", reason)}
                loading={pending}
              >
                {pending ? "Recusando…" : "Recusar documento"}
              </Button>
              <Button type="button" variant="ghost" onClick={idle} disabled={pending}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {mode === "document-reset" && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-brand-ink">
              Resetar a etapa de documento? A pessoa voltará para &quot;Documento&quot; e poderá
              reenviar. Perfil, endereço e Pix ficam mantidos.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={resetDocument} loading={pending}>
                {pending ? "Resetando…" : "Confirmar reset"}
              </Button>
              <Button type="button" variant="ghost" onClick={idle} disabled={pending}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <FieldError>{error}</FieldError>
      </Card>
    </div>
  );
}
