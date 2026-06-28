"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError } from "@/components/ui/field";
import type { EnrollmentFees } from "@/lib/api/leadership";

type ActionType = "fee-pay" | "fee-schedule" | "conclude";
type ErrBody = { detail?: string; code?: string };

/**
 * Roteia o erro da decisão por `switch(code)` (regra do monólito: nunca decidir
 * parseando `detail`). Códigos desconhecidos caem no `detail` do back (em pt-BR).
 */
function enrollmentMessage(body: ErrBody): string {
  switch (body.code) {
    case "ENROLLMENT_NOT_FOUND":
      return "Essa matrícula não é (mais) do seu polo — pode já ter saído da fila.";
    case "NOT_HUB_COORDINATOR":
      return "Você não coordena nenhum polo, então não dá pra operar matrícula aqui.";
    case "FORBIDDEN_ROLE":
      return "Seu acesso não permite operar matrículas.";
    case "FEES_INCOMPLETE":
      return "Ainda falta pagar ou agendar uma das parcelas antes de concluir.";
    case "FEE_QR_INVALID":
      return "Esse QR Pix não é válido. Confira na plataforma parceira e cole de novo.";
    case "FEE_QR_NO_DUE_DATE":
      return "O QR da 2ª parcela precisa ter vencimento dentro dele. Pegue um novo na plataforma parceira.";
    case "FEE_ALREADY_PAID":
      return "A 1ª parcela já está paga — não precisa pagar de novo.";
    case "FEE_ALREADY_SCHEDULED":
      return "A 2ª parcela já está agendada — não precisa agendar de novo.";
    case "WRONG_STATUS":
      return "A matrícula não está na fase esperada pra essa ação. Atualize a página.";
    case "RATE_LIMITED":
      return "Muitas tentativas seguidas. Espere um instante e tente de novo.";
    case "DESCRIPTION_REQUIRED":
      return "Preencha os campos obrigatórios antes de continuar.";
    case "UNAUTHORIZED":
      return "Sua sessão expirou. Entre de novo pra continuar.";
    default:
      return body.detail || "Não deu pra concluir a ação agora. Tente de novo.";
  }
}

/**
 * Ações L2 da matrícula do coordenador: pagar 1ª parcela (R$ à vista via
 * Asaas/DICT), agendar 2ª parcela (R$ em ~30d), e concluir (cola login/senha
 * da plataforma parceira → enrollment vira student). Cada ação exige confirmação
 * explícita de 2 passos porque mexe em dinheiro real da empresa e/ou credencial
 * do aluno. Os POSTs vão pros route handlers em /api/leadership/... que injetam
 * o cookie HttpOnly.
 */
export function MatriculaActions({
  externalId,
  fees,
}: {
  externalId: string;
  fees: EnrollmentFees | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<ActionType | "idle">("idle");
  const [qr, setQr] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [platformUrl, setPlatformUrl] = useState("");
  const [platformNotes, setPlatformNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Habilita cada ação só quando faz sentido — fee/pay se 1ª não está paga;
  // fee/schedule se 2ª não está agendada; conclude se ambas prontas. O back
  // ainda valida (FEES_INCOMPLETE / FEE_ALREADY_*) e responde com code — mas
  // esconder o botão evita cliques inúteis.
  const firstPaid = fees?.first_paid === true;
  const secondScheduled = fees?.second_scheduled === true;
  const showPay = !firstPaid;
  const showSchedule = !secondScheduled;
  const showConclude = firstPaid && secondScheduled;

  function idle() {
    setMode("idle");
    setQr("");
    setLogin("");
    setPassword("");
    setPlatformUrl("");
    setPlatformNotes("");
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

  function postFee(path: string, body: FeeInBody) {
    return fetch(`/api/leadership/enrollments/${externalId}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  function postConclude(body: ConcludeBody) {
    return fetch(`/api/leadership/enrollments/${externalId}/conclude`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  function submitFee(action: "fee-pay" | "fee-schedule") {
    const value = qr.trim();
    if (!value) {
      setError("Cole o QR Pix copiado na plataforma parceira.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const path = action === "fee-pay" ? "/fee/pay" : "/fee/schedule";
        const res = await postFee(path, { qr_code: value });
        if (!res.ok) {
          setError(enrollmentMessage(await res.json().catch(() => ({}))));
          return;
        }
        done();
      } catch {
        setError("Falha de rede. Tente de novo.");
      }
    });
  }

  function submitConclude() {
    const l = login.trim();
    const p = password.trim();
    if (!l || !p) {
      setError("Cole o login e a senha da plataforma parceira.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const body: ConcludeBody = {
          platform_login: l,
          platform_password: p,
          ...(platformUrl.trim() ? { platform_url: platformUrl.trim() } : {}),
          ...(platformNotes.trim()
            ? { platform_notes: platformNotes.trim() }
            : {}),
        };
        const res = await postConclude(body);
        if (!res.ok) {
          setError(enrollmentMessage(await res.json().catch(() => ({}))));
          return;
        }
        // Concluído → sai da fila de matrículas do polo.
        router.push("/coordenador/matriculas");
        router.refresh();
      } catch {
        setError("Falha de rede. Tente de novo.");
      }
    });
  }

  return (
    <div className="grid gap-4 max-w-2xl">
      {/* Pagar 1ª parcela */}
      {showPay && (
        <Card>
          <h2 className="font-display text-base">Pagar 1ª parcela (à vista)</h2>
          <p className="text-sm text-brand-muted mt-1">
            Pegue o QR Pix da 1ª parcela na plataforma parceira e cole aqui.
            Nosso app dispara o pagamento via Asaas/DICT (saída real da empresa).
          </p>

          {mode !== "fee-pay" && (
            <div className="mt-4">
              <Button type="button" onClick={() => start("fee-pay")}>
                Pagar 1ª parcela
              </Button>
            </div>
          )}

          {mode === "fee-pay" && (
            <div className="mt-4 space-y-3">
              <label htmlFor="qr-pay" className="block text-sm text-black">
                QR Pix (copia e cola)
              </label>
              <textarea
                id="qr-pay"
                value={qr}
                onChange={(e) => setQr(e.target.value)}
                rows={3}
                placeholder="Cole aqui o código Pix que você pegou na plataforma parceira"
                className="w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-xs font-mono text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-gold-ink/40"
              />
              <p className="text-sm text-black">
                Confirmar pagamento? Isso vai disparar a 1ª parcela via Asaas/DICT
                com o valor lido do QR.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button type="button" onClick={() => submitFee("fee-pay")} loading={pending}>
                  {pending ? "Pagando…" : "Confirmar pagamento"}
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

      {/* Agendar 2ª parcela */}
      {showSchedule && (
        <Card>
          <h2 className="font-display text-base">Agendar 2ª parcela (~30d)</h2>
          <p className="text-sm text-brand-muted mt-1">
            Pegue o QR Pix da 2ª parcela na plataforma parceira (com vencimento).
            Cole aqui — o app agenda o pagamento; o Asaas dispara no vencimento.
            Pode ser feito em paralelo com a 1ª parcela.
          </p>

          {mode !== "fee-schedule" && (
            <div className="mt-4">
              <Button type="button" onClick={() => start("fee-schedule")}>
                Agendar 2ª parcela
              </Button>
            </div>
          )}

          {mode === "fee-schedule" && (
            <div className="mt-4 space-y-3">
              <label htmlFor="qr-schedule" className="block text-sm text-black">
                QR Pix (com vencimento)
              </label>
              <textarea
                id="qr-schedule"
                value={qr}
                onChange={(e) => setQr(e.target.value)}
                rows={3}
                placeholder="Cole aqui o código Pix com vencimento ~30d"
                className="w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-xs font-mono text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-gold-ink/40"
              />
              <p className="text-sm text-black">
                Confirmar agendamento? O Asaas disparará o pagamento no vencimento
                dentro do QR.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button type="button" onClick={() => submitFee("fee-schedule")} loading={pending}>
                  {pending ? "Agendando…" : "Confirmar agendamento"}
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

      {/* Concluir matrícula → student */}
      {showConclude && (
        <Card>
          <h2 className="font-display text-base">Concluir matrícula</h2>
          <p className="text-sm text-brand-muted mt-1">
            Com as 2 parcelas resolvidas, pegue o login e a senha do aluno na
            plataforma parceira e cole aqui. Ao concluir, o aluno vira student e
            o JWT antigo dele é invalidado (vai precisar entrar de novo).
          </p>

          {mode !== "conclude" && (
            <div className="mt-4">
              <Button type="button" onClick={() => start("conclude")}>
                Concluir matrícula
              </Button>
            </div>
          )}

          {mode === "conclude" && (
            <div className="mt-4 space-y-3">
              <label htmlFor="platform-login" className="block text-sm text-black">
                Login na plataforma parceira
              </label>
              <input
                id="platform-login"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="login que você pegou na plataforma parceira"
                className="w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-gold-ink/40"
                autoComplete="off"
              />
              <label htmlFor="platform-password" className="block text-sm text-black">
                Senha
              </label>
              <input
                id="platform-password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="senha que você pegou na plataforma parceira"
                className="w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-gold-ink/40"
                autoComplete="off"
              />
              <label htmlFor="platform-url" className="block text-sm text-black">
                URL de acesso (opcional)
              </label>
              <input
                id="platform-url"
                value={platformUrl}
                onChange={(e) => setPlatformUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-gold-ink/40"
                autoComplete="off"
              />
              <label htmlFor="platform-notes" className="block text-sm text-black">
                Notas internas (opcional)
              </label>
              <textarea
                id="platform-notes"
                value={platformNotes}
                onChange={(e) => setPlatformNotes(e.target.value)}
                rows={2}
                placeholder="Observações sobre a matrícula (não vai pro aluno)"
                className="w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-gold-ink/40"
              />
              <p className="text-sm text-black">
                Confirmar conclusão? O aluno vira student e o JWT antigo é invalidado.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button type="button" onClick={submitConclude} loading={pending}>
                  {pending ? "Concluindo…" : "Confirmar conclusão"}
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

      {!showPay && !showSchedule && !showConclude && (
        <Card className="text-sm text-brand-muted">
          As duas parcelas já foram resolvidas e a matrícula ainda não foi
          concluída. Aguardando ação do coordenador.
        </Card>
      )}
    </div>
  );
}

type FeeInBody = { qr_code: string; amount?: string };
type ConcludeBody = {
  platform_login: string;
  platform_password: string;
  platform_url?: string;
  platform_notes?: string;
};