"use client";

import { CheckCircle2, GraduationCap, LoaderCircle, X } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

type InviteResult = {
  sent: boolean;
  phone_last4: string;
};

function inviteError(code?: string, detail?: string) {
  if (code === "CPF_INVALID") return "Digite um CPF válido.";
  if (code === "PHONE_INVALID") return "Digite um telefone válido, com DDD.";
  if (code === "PHONE_NOT_ON_WHATSAPP") return "Esse número não tem WhatsApp ativo.";
  if (code === "CPF_EXISTS") return "Esse CPF já está cadastrado.";
  if (code === "PHONE_EXISTS") return "Esse telefone já está cadastrado.";
  if (code === "PHONE_SERVICE_DOWN") return "Não conseguimos verificar o WhatsApp agora. Tente novamente.";
  return detail || "Não foi possível enviar o convite agora.";
}

export function LeadInviteDialog() {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InviteResult | null>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open, pending]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/me/promoter/leads/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, cpf }),
      });
      const data = (await response.json()) as InviteResult & {
        code?: string;
        detail?: string;
      };
      if (!response.ok) {
        setError(inviteError(data.code, data.detail));
        return;
      }
      setResult(data);
      setPhone("");
      setCpf("");
    } catch {
      setError("A conexão oscilou. Confira a internet e tente novamente.");
    } finally {
      setPending(false);
    }
  }

  function close() {
    if (pending) return;
    setOpen(false);
    setError(null);
    setResult(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative -mt-5 flex min-h-[4.5rem] min-w-[4.8rem] flex-col items-center justify-center rounded-2xl border border-[#e2c700] bg-[#ffdf00] px-2 pb-1.5 pt-2 text-[0.72rem] font-extrabold text-[#071f36] shadow-[0_12px_28px_-16px_rgba(7,21,33,0.72)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#009c3b]"
        aria-haspopup="dialog"
      >
        <GraduationCap aria-hidden className="size-6" />
        <span>Matricular</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-[#071521]/70 p-3 sm:items-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-lead-title"
            className="w-full max-w-md rounded-[22px] border border-[var(--surface-border)] bg-[var(--surface)] p-5 text-[var(--surface-text)] shadow-[0_28px_80px_-32px_rgba(7,21,33,0.72)] sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="section-label">Nova indicação</p>
                <h2 id="invite-lead-title" className="mt-1 font-display text-2xl">Matricular uma pessoa</h2>
                <p className="mt-1 text-sm text-[var(--surface-text-muted)]">
                  Informe telefone e CPF. Se estiver tudo certo, enviaremos um acesso seguro pelo WhatsApp.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                disabled={pending}
                className="grid size-11 shrink-0 place-items-center rounded-full border border-[var(--surface-border)]"
                aria-label="Fechar"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>

            {result ? (
              <div className="mt-5 space-y-4" role="status">
                <div className="rounded-[var(--radius-sm)] border border-[var(--ok)]/35 bg-[var(--surface-alt)] p-4">
                  <CheckCircle2 aria-hidden className="mb-3 size-7 text-[var(--ok)]" />
                  <p className="font-semibold">Convite encaminhado</p>
                  <p className="mt-1 text-sm text-[var(--surface-text-muted)]">
                    Enviamos o link ao WhatsApp terminado em {result.phone_last4}. A pessoa confirma os próprios dados para continuar.
                  </p>
                </div>
                <button type="button" onClick={close} className="min-h-12 w-full rounded-[var(--radius-sm)] bg-[var(--brand-green)] font-bold text-white">
                  Fechar
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-5 space-y-4">
                <label className="block">
                  <span className="label">Telefone com DDD</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="(43) 99999-9999"
                    required
                    className="input mt-1 w-full"
                  />
                </label>
                <label className="block">
                  <span className="label">CPF</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={cpf}
                    onChange={(event) => setCpf(event.target.value)}
                    placeholder="000.000.000-00"
                    required
                    className="input mt-1 w-full"
                  />
                </label>
                {error && <p className="text-sm font-medium text-[var(--danger)]" role="alert">{error}</p>}
                <button
                  type="submit"
                  disabled={pending || !phone.trim() || !cpf.trim()}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--brand-green)] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pending && <LoaderCircle aria-hidden className="size-5 animate-spin" />}
                  {pending ? "Enviando convite…" : "Enviar convite"}
                </button>
                <p className="text-xs leading-relaxed text-[var(--surface-text-muted)]">
                  A pessoa confirma os dados e conclui o próprio cadastro.
                </p>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
}
