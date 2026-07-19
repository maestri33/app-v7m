"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";

import { CopilotKit } from "@copilotkit/react-core";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { StatusBanner } from "@/components/ui/status-banner";
import { UploadActions } from "@/components/ui/upload-actions";
import { wrongStatusHref } from "@/lib/candidate/funnel";
import { apiErrorMessage } from "@/lib/api/error-messages";
import {
  compressImage,
  FILE_TOO_LARGE_MSG,
  MAX_UPLOAD_BYTES,
} from "@/lib/images/compress";
import type { AddressProofBlock, CandidateMe } from "@/lib/api/types";

import { KinshipChat } from "./kinship-chat";

const POLL_MS = 2500;

// Fetcher que FALHA em erro (r.ok) + timeout: um envelope {detail,code} não pode
// virar `me` (senão `sent` volta a false no meio da análise e o poll para).
async function fetchMe(url: string): Promise<CandidateMe> {
  const r = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error(`candidate ${r.status}`);
  return r.json();
}

type Props = {
  initial: AddressProofBlock | null;
  /** IA (CopilotKit) configurada no server? Se não, mostra SÓ o form manual. */
  aiEnabled?: boolean;
};

/**
 * Comprovante de residência — sub-passo OBRIGATÓRIO do endereço.
 *
 * O backend só tira o candidato de `profile` com endereço completo E
 * comprovante APROVADO pela IA; antes este card morava em /documento rotulado
 * "opcional" e quem não enviava ficava preso sem pista. A validação é
 * assíncrona: o upload devolve `pending` e o veredito chega pelo poll do
 * `me_dict` (backoff exponencial, para em estado terminal).
 */
export function AddressProofSection({ initial, aiEnabled = false }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const pendingPolls = useRef(0);

  const { data: me, mutate } = useSWR<CandidateMe>(
    "/api/me/candidate",
    fetchMe,
    {
      refreshInterval: (latest) => {
        const st = latest?.address_proof?.status;
        const sent = Boolean(latest?.address_proof?.photo);
        if (!sent || st !== "pending") {
          pendingPolls.current = 0;
          return 0;
        }
        const interval = Math.min(POLL_MS * 2 ** pendingPolls.current, 30_000);
        pendingPolls.current += 1;
        return interval;
      },
    },
  );

  const proof = me?.address_proof ?? initial;
  // `AddressProof` nasce junto com o Document (status default `pending`, SEM
  // foto) — "enviado" é ter foto, não ter status.
  const sent = Boolean(proof?.photo);
  const status = proof?.status ?? null;

  // Comprovante aprovado → o back avança profile→address sozinho; segue o funil.
  useEffect(() => {
    const st = me?.status;
    if (st && st !== "profile" && st !== "started") {
      router.push("/documento");
    }
  }, [me?.status, router]);

  function onFile(rawFile: File) {
    setError(null);
    startTransition(async () => {
      try {
        const file = await compressImage(rawFile);
        if (file.size > MAX_UPLOAD_BYTES) {
          setError(FILE_TOO_LARGE_MSG);
          return;
        }
        const form = new FormData();
        form.append("file", file, file.name);
        const res = await fetch("/api/me/document/address-proof", {
          method: "POST",
          body: form,
        });
        const data: { detail?: string; code?: string; expected_status?: string } =
          await res.json();
        if (!res.ok) {
          const redir = wrongStatusHref(data.code, data.expected_status);
          if (redir) {
            router.push(redir);
            return;
          }
          setError(apiErrorMessage(data.code, data.detail, data));
          return;
        }
        await mutate(); // traz o `pending` e liga o poll
      } catch {
        setError("A conexão oscilou. Tente de novo — nada foi perdido.");
      }
    });
  }

  // Resposta do chat conforme o veredito REAL (antes o chat confirmava
  // "registrado" mesmo quando o back recusava a explicação).
  async function submitKinship(relation: string): Promise<string> {
    const res = await fetch("/api/me/document/address-proof/kinship", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ relation }),
    });
    if (!res.ok) {
      return "Não consegui registrar agora — a conexão falhou. Tenta explicar de novo?";
    }
    const fresh = await mutate();
    if (fresh?.address_proof?.status === "needs_kinship") {
      return "Hmm, ainda não consegui validar esse vínculo. Pode explicar melhor de quem é a conta e qual o seu parentesco com essa pessoa?";
    }
    return "Explicação registrada! Vamos seguir com o seu cadastro.";
  }

  // needs_kinship: titular é outra pessoa → explica o vínculo. O FORM MANUAL é
  // sempre o caminho principal (funciona sem IA nenhuma — o backend faz o
  // trabalho de verdade). O chat de IA é um EXTRA opcional, e só aparece quando
  // configurado. Antes, este passo dependia SÓ do chat: sem OMNIROUTE (o
  // default), o candidato ficava PERMANENTEMENTE preso num gate obrigatório.
  if (status === "needs_kinship") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-brand-muted">
          O comprovante está no nome de outra pessoa — sem problema: explica pra
          gente qual o seu vínculo com ela.
        </p>
        <KinshipManualForm onSubmit={submitKinship} />
        {aiEnabled && (
          <details className="rounded-[var(--radius)] border border-[var(--surface-border)]">
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-brand-gold-ink">
              Prefere explicar conversando? Fale com o assistente
            </summary>
            <div className="p-2 pt-0">
              <CopilotKit runtimeUrl="/api/copilotkit">
                <KinshipChat onSubmit={submitKinship} />
              </CopilotKit>
            </div>
          </details>
        )}
      </div>
    );
  }

  // Analisando (foto enviada, veredito a caminho).
  if (sent && status === "pending") {
    return (
      <div className="space-y-3">
        <p className="flex items-center gap-2 text-sm font-medium text-brand-gold-ink" role="status">
          <Spinner /> Conferindo seu comprovante… costuma levar menos de um minuto.
        </p>
        <p className="text-xs text-brand-muted">
          Pode deixar esta tela aberta — a gente avança sozinho quando aprovar.
        </p>
      </div>
    );
  }

  // Em revisão manual: humano decide; sem avanço automático.
  if (sent && status === "review") {
    return (
      <div className="space-y-3 text-center py-2">
        <h2 className="font-display text-lg">Comprovante em análise manual</h2>
        <p className="text-sm text-brand-muted">
          Nosso time vai conferir e você recebe um aviso no WhatsApp — não devia
          demorar.
        </p>
      </div>
    );
  }

  // Aprovado: o efeito acima já está navegando; feedback pra transição.
  if (sent && status === "approved") {
    return (
      <div className="banner banner-ok" role="status">
        <p className="font-display">Comprovante aprovado ✓</p>
        <p className="text-sm mt-1 opacity-90">Endereço confirmado. Avançando…</p>
      </div>
    );
  }

  // Não enviado ainda, ou reprovado (reenviar).
  return (
    <div className="space-y-4">
      {sent && status === "rejected" && (
        <StatusBanner status="rejected" reason={proof?.reason ?? null} />
      )}
      <p id="address-proof-label" className="text-sm text-brand-muted">
        Envie um comprovante de residência recente (conta de luz, água, internet
        ou telefone) — precisa bater com o endereço que você informou. Pode ser
        foto ou PDF.
      </p>
      <UploadActions
        onFile={onFile}
        disabled={pending}
        pending={pending}
        retry={sent && status === "rejected"}
      />
      {sent && status === "rejected" && (
        <Button
          href="/endereco?editar=1"
          variant="ghost"
          className="w-full text-brand-ink border-brand-border"
        >
          O endereço que informei está errado — corrigir
        </Button>
      )}
      <FieldError>{error}</FieldError>
    </div>
  );
}

/**
 * Form manual do vínculo (needs_kinship) — SEM IA. Envia a explicação direto pro
 * mesmo endpoint que a ação da IA usava (`onSubmit` → address-proof/kinship). É o
 * que garante que o passo SEMPRE dá pra concluir, com ou sem assistente ligado.
 */
function KinshipManualForm({
  onSubmit,
}: {
  onSubmit: (relation: string) => Promise<string>;
}) {
  const [relation, setRelation] = useState("");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = relation.trim();
    if (!text) {
      setMsg("Escreva de quem é a conta e qual o seu vínculo com essa pessoa.");
      return;
    }
    setMsg(null);
    startTransition(async () => {
      setMsg(await onSubmit(text));
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label htmlFor="kinship-relation" className="block text-sm font-semibold text-brand-ink">
        De quem é a conta e qual o seu vínculo?
      </label>
      <textarea
        id="kinship-relation"
        value={relation}
        onChange={(e) => setRelation(e.target.value)}
        rows={3}
        placeholder="Ex.: é a conta da minha mãe, Maria da Silva."
        className="w-full rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-2 text-sm"
      />
      <Button type="submit" size="xl" loading={pending} className="w-full">
        {pending ? "Enviando…" : "Enviar explicação"}
      </Button>
      {msg && (
        <p className="text-sm text-brand-muted" role="status">
          {msg}
        </p>
      )}
    </form>
  );
}
