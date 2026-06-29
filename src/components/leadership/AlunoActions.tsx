"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError } from "@/components/ui/field";
import type { StudentDetail, StudentPendency } from "@/lib/api/leadership";

type ActionType =
  | "exam"
  | "pendency"
  | "clear"
  | "diploma"
  | { kind: "resolve"; pendency: StudentPendency };
type ErrBody = { detail?: string; code?: string };

/**
 * Roteia o erro da decisão por `switch(code)` (regra do monólito: nunca decidir
 * parseando `detail`). Códigos desconhecidos caem no `detail` do back (em pt-BR).
 */
function studentMessage(body: ErrBody): string {
  switch (body.code) {
    case "STUDENT_NOT_FOUND":
      return "Esse aluno não é (mais) do seu polo — pode já ter saído da fila.";
    case "NOT_HUB_COORDINATOR":
      return "Você não coordena nenhum polo, então não dá pra decidir aqui.";
    case "FORBIDDEN_ROLE":
      return "Seu acesso não permite decidir alunos.";
    case "NO_PENDING_EXAM":
      return "Não há prova pendente pra corrigir agora.";
    case "ALREADY_GRADING":
      return "Essa prova já foi corrigida.";
    case "OPEN_PENDENCIES":
      return "Ainda há pendência em aberto — resolva antes de liberar a documentação.";
    case "PENDENCY_NOT_FOUND":
      return "Essa pendência não existe mais — talvez já tenha sido resolvida.";
    case "DIPLOMA_NOT_ISSUED":
      return "O diploma ainda não pode ser emitido nesta etapa.";
    case "WRONG_STATUS":
      return "O aluno não está na fase esperada pra essa ação. Atualize a página.";
    case "DESCRIPTION_REQUIRED":
    case "NO_FIELDS":
      return "Preencha os campos obrigatórios antes de continuar.";
    case "UNAUTHORIZED":
      return "Sua sessão expirou. Entre de novo pra continuar.";
    default:
      return body.detail || "Não deu pra concluir a ação agora. Tente de novo.";
  }
}

const TEXTAREA_CLS =
  "w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-gold-ink/40";
const INPUT_CLS = TEXTAREA_CLS;

/**
 * Ações L2 do detalhe do aluno: corrigir prova, abrir/resolver pendência, liberar
 * documentação, emitir diploma. Cada ação irreversível exige confirmação explícita
 * (2 passos) porque mexe em status/identidade reais. Os POSTs vão pros route
 * handlers em /api/leadership/... que injetam o cookie HttpOnly. A decisão de
 * documento em revisão é disparada pela fila de Revisões (que leva o documento).
 */
export function AlunoActions({ data }: { data: StudentDetail }) {
  const router = useRouter();
  const externalId = data.external_id;
  const [mode, setMode] = useState<ActionType | "idle">("idle");
  const [examPassed, setExamPassed] = useState<boolean | null>(null);
  const [examNotes, setExamNotes] = useState("");
  const [pendencyKind, setPendencyKind] = useState<"document" | "fee">("document");
  const [pendencyDesc, setPendencyDesc] = useState("");
  const [pendencyAmount, setPendencyAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const openPendencies = data.pendencies.filter((p) => !p.resolved);

  function idle() {
    setMode("idle");
    setExamPassed(null);
    setExamNotes("");
    setPendencyKind("document");
    setPendencyDesc("");
    setPendencyAmount("");
    setError(null);
  }

  function done() {
    router.refresh();
    idle();
  }

  function start(action: ActionType) {
    setError(null);
    setMode(action);
  }

  function post(path: string, body?: object) {
    return fetch(`/api/leadership/students/${externalId}${path}`, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  function run(req: Promise<Response>, redirectTo?: string) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await req;
        if (!res.ok) {
          setError(studentMessage(await res.json().catch(() => ({}))));
          return;
        }
        if (redirectTo) {
          router.push(redirectTo);
          router.refresh();
        } else {
          done();
        }
      } catch {
        setError("Falha de rede. Tente de novo.");
      }
    });
  }

  function submitExam() {
    if (examPassed === null) {
      setError("Diga se o aluno passou ou não na prova.");
      return;
    }
    run(
      post("/exam/grade", {
        passed: examPassed,
        ...(examNotes.trim() ? { notes: examNotes.trim() } : {}),
      }),
    );
  }

  function submitPendency() {
    const desc = pendencyDesc.trim();
    if (!desc) {
      setError("Descreva o que está pendente — a equipe vai ler.");
      return;
    }
    let amountCents: number | undefined;
    if (pendencyKind === "fee" && pendencyAmount.trim()) {
      const reais = Number(pendencyAmount.replace(",", "."));
      if (Number.isNaN(reais) || reais < 0) {
        setError("Valor inválido. Use um número (ex: 150,00).");
        return;
      }
      amountCents = Math.round(reais * 100);
    }
    run(
      post("/pendencies", {
        kind: pendencyKind,
        description: desc,
        ...(amountCents != null ? { amount_cents: amountCents } : {}),
      }),
    );
  }

  function resolvePendency(p: StudentPendency) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/leadership/pendencies/${p.external_id}/resolve`, {
          method: "POST",
        });
        if (!res.ok) {
          setError(studentMessage(await res.json().catch(() => ({}))));
          return;
        }
        done();
      } catch {
        setError("Falha de rede. Tente de novo.");
      }
    });
  }

  const resolving = typeof mode === "object" && mode.kind === "resolve";

  return (
    <div className="grid gap-4 max-w-2xl">
      {/* Corrigir prova */}
      <Card>
        <h2 className="font-display text-base">Corrigir prova</h2>
        <p className="text-sm text-brand-muted mt-1">
          Passou → segue pra conferência da documentação; reprovou → o aluno refaz.
          A correção muda o status real do aluno.
        </p>

        {mode !== "exam" && (
          <div className="mt-4">
            <Button type="button" onClick={() => start("exam")}>
              Corrigir prova
            </Button>
          </div>
        )}

        {mode === "exam" && (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant={examPassed === true ? "primary" : "ghost"}
                onClick={() => setExamPassed(true)}
              >
                Passou
              </Button>
              <Button
                type="button"
                variant={examPassed === false ? "primary" : "ghost"}
                onClick={() => setExamPassed(false)}
              >
                Reprovou
              </Button>
            </div>
            <label htmlFor="exam-notes" className="block text-sm text-brand-ink">
              Observações (opcional)
            </label>
            <textarea
              id="exam-notes"
              value={examNotes}
              onChange={(e) => setExamNotes(e.target.value)}
              rows={2}
              placeholder="Notas internas sobre a correção"
              className={TEXTAREA_CLS}
            />
            <p className="text-sm text-brand-ink">
              Confirmar a correção? Isso muda o status do aluno na hora.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={submitExam} loading={pending}>
                {pending ? "Salvando…" : "Confirmar correção"}
              </Button>
              <Button type="button" variant="ghost" onClick={idle} disabled={pending}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <FieldError>{mode === "exam" ? error : null}</FieldError>
      </Card>

      {/* Pendências em aberto: resolver */}
      {openPendencies.length > 0 && (
        <Card>
          <h2 className="font-display text-base">Resolver pendência</h2>
          <p className="text-sm text-brand-muted mt-1">
            Resolver uma pendência tira o aluno do estado de pendência. Sem nenhuma
            pendência aberta, ele segue pro diploma.
          </p>
          <ul className="mt-4 grid gap-3">
            {openPendencies.map((p) => {
              const isThis =
                typeof mode === "object" &&
                mode.kind === "resolve" &&
                mode.pendency.external_id === p.external_id;
              return (
                <li key={p.external_id} className="text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-brand-ink">{p.description}</span>
                    {!isThis && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => start({ kind: "resolve", pendency: p })}
                      >
                        Resolver
                      </Button>
                    )}
                  </div>
                  {isThis && (
                    <div className="mt-2 space-y-2">
                      <p className="text-brand-ink">
                        Confirmar que esta pendência foi resolvida?
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <Button
                          type="button"
                          onClick={() => resolvePendency(p)}
                          loading={pending}
                        >
                          {pending ? "Resolvendo…" : "Confirmar resolução"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={idle}
                          disabled={pending}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <FieldError>{resolving ? error : null}</FieldError>
        </Card>
      )}

      {/* Abrir pendência */}
      <Card>
        <h2 className="font-display text-base">Abrir pendência</h2>
        <p className="text-sm text-brand-muted mt-1">
          Lança uma pendência (documento ou taxa) → o aluno vai pra pendência. O valor
          da taxa é só registro: não move dinheiro aqui.
        </p>

        {mode !== "pendency" && (
          <div className="mt-4">
            <Button type="button" onClick={() => start("pendency")}>
              Abrir pendência
            </Button>
          </div>
        )}

        {mode === "pendency" && (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant={pendencyKind === "document" ? "primary" : "ghost"}
                onClick={() => setPendencyKind("document")}
              >
                Documento
              </Button>
              <Button
                type="button"
                variant={pendencyKind === "fee" ? "primary" : "ghost"}
                onClick={() => setPendencyKind("fee")}
              >
                Taxa
              </Button>
            </div>
            <label htmlFor="pendency-desc" className="block text-sm text-brand-ink">
              Descrição
            </label>
            <textarea
              id="pendency-desc"
              value={pendencyDesc}
              onChange={(e) => setPendencyDesc(e.target.value)}
              rows={2}
              placeholder="Explique o que está pendente"
              className={TEXTAREA_CLS}
            />
            {pendencyKind === "fee" && (
              <>
                <label htmlFor="pendency-amount" className="block text-sm text-brand-ink">
                  Valor de referência (R$, opcional)
                </label>
                <input
                  id="pendency-amount"
                  value={pendencyAmount}
                  onChange={(e) => setPendencyAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="Ex: 150,00"
                  className={INPUT_CLS}
                  autoComplete="off"
                />
              </>
            )}
            <p className="text-sm text-brand-ink">
              Confirmar a abertura? O aluno passa a ter uma pendência em aberto.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={submitPendency} loading={pending}>
                {pending ? "Abrindo…" : "Confirmar abertura"}
              </Button>
              <Button type="button" variant="ghost" onClick={idle} disabled={pending}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <FieldError>{mode === "pendency" ? error : null}</FieldError>
      </Card>

      {/* Liberar documentação */}
      <Card>
        <h2 className="font-display text-base">Liberar documentação</h2>
        <p className="text-sm text-brand-muted mt-1">
          Confirma que não há pendência → libera a emissão do diploma. Não funciona
          enquanto houver pendência em aberto.
        </p>

        {mode !== "clear" && (
          <div className="mt-4">
            <Button type="button" onClick={() => start("clear")}>
              Liberar documentação
            </Button>
          </div>
        )}

        {mode === "clear" && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-brand-ink">
              Confirmar que a documentação está completa? Isso libera o diploma.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={() => run(post("/documentation/clear"))}
                loading={pending}
              >
                {pending ? "Liberando…" : "Confirmar liberação"}
              </Button>
              <Button type="button" variant="ghost" onClick={idle} disabled={pending}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <FieldError>{mode === "clear" ? error : null}</FieldError>
      </Card>

      {/* Emitir diploma */}
      {!data.diploma && (
        <Card>
          <h2 className="font-display text-base">Emitir diploma</h2>
          <p className="text-sm text-brand-muted mt-1">
            Emite o diploma (certificado + histórico) → o aluno fica aguardando a
            retirada. Ação irreversível.
          </p>

          {mode !== "diploma" && (
            <div className="mt-4">
              <Button type="button" onClick={() => start("diploma")}>
                Emitir diploma
              </Button>
            </div>
          )}

          {mode === "diploma" && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-brand-ink">
                Confirmar a emissão do diploma? Não dá pra desfazer.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={() => run(post("/diploma/issue"))}
                  loading={pending}
                >
                  {pending ? "Emitindo…" : "Confirmar emissão"}
                </Button>
                <Button type="button" variant="ghost" onClick={idle} disabled={pending}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          <FieldError>{mode === "diploma" ? error : null}</FieldError>
        </Card>
      )}
    </div>
  );
}
