"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError } from "@/components/ui/field";
import { MATERIAL_KINDS, type Material } from "@/lib/api/leadership";

type ErrBody = { detail?: string; code?: string };

/**
 * Roteia o erro por `switch(code)` (regra do monólito: nunca decidir parseando
 * `detail`). Códigos desconhecidos caem no `detail` do back (em pt-BR).
 */
function materialMessage(body: ErrBody): string {
  switch (body.code) {
    case "NOT_HUB_COORDINATOR":
      return "Você não coordena nenhum polo, então não dá pra autorar matérias aqui.";
    case "FORBIDDEN_ROLE":
      return "Seu acesso não permite autorar matérias.";
    case "MATERIAL_NOT_FOUND":
      return "Essa matéria não existe mais — atualize a página.";
    case "INVALID_MATERIAL_KIND":
    case "INVALID_KIND":
      return "Tipo de matéria inválido.";
    case "DESCRIPTION_REQUIRED":
    case "NO_FIELDS":
      return "Preencha título, questão e gabarito.";
    case "UNAUTHORIZED":
      return "Sua sessão expirou. Entre de novo pra continuar.";
    default:
      return body.detail || "Não deu pra salvar a matéria agora. Tente de novo.";
  }
}

const LABEL_CLS = "block text-sm text-brand-ink";
const INPUT_CLS =
  "w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-gold-ink/40";

type FormState = {
  title: string;
  question: string;
  expected_answer: string;
  text_content: string;
  kind: string;
  blocking: boolean;
  order: string;
  active: boolean;
};

function emptyForm(): FormState {
  return {
    title: "",
    question: "",
    expected_answer: "",
    text_content: "",
    kind: "fixed",
    blocking: true,
    order: "0",
    active: true,
  };
}

function fromMaterial(m: Material): FormState {
  return {
    title: m.title,
    question: m.question,
    expected_answer: m.expected_answer,
    text_content: m.text_content ?? "",
    kind: m.kind,
    blocking: m.blocking,
    order: String(m.order ?? 0),
    active: m.active,
  };
}

function kindLabel(kind: string): string {
  return MATERIAL_KINDS.find((k) => k.value === kind)?.label ?? kind;
}

/**
 * Autoria de matéria do treino: lista as matérias existentes (com gabarito), cria
 * uma nova e edita as existentes. `blocking` define se a matéria trava o painel do
 * promotor até ser aprovada; `kind` fixa (todo promotor novo recebe) ou transitória
 * (só os já existentes). Conteúdo rico (content_blocks com vídeo/imagem/arquivo) NÃO
 * é editado aqui por ora — só texto/questão/gabarito; as matérias que já têm blocos
 * os preservam (o PUT só envia os campos editados). Os requests vão pros route
 * handlers em /api/leadership/training/materials que injetam o cookie HttpOnly.
 */
export function TreinamentoEditor({
  materials,
  loadError,
}: {
  materials: Material[];
  loadError: string | null;
}) {
  const router = useRouter();
  // null = nenhum form aberto; "new" = criando; string = editando aquele external_id
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openNew() {
    setEditing("new");
    setForm(emptyForm());
    setError(null);
  }

  function openEdit(m: Material) {
    setEditing(m.external_id);
    setForm(fromMaterial(m));
    setError(null);
  }

  function close() {
    setEditing(null);
    setForm(emptyForm());
    setError(null);
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    const title = form.title.trim();
    const question = form.question.trim();
    const expected_answer = form.expected_answer.trim();
    if (!title || !question || !expected_answer) {
      setError("Preencha título, questão e gabarito.");
      return;
    }
    const orderNum = Number(form.order);
    const order = Number.isFinite(orderNum) ? Math.max(0, Math.trunc(orderNum)) : 0;
    const isNew = editing === "new";
    setError(null);
    startTransition(async () => {
      try {
        const body = {
          title,
          question,
          expected_answer,
          text_content: form.text_content,
          kind: form.kind,
          blocking: form.blocking,
          order,
          ...(isNew ? {} : { active: form.active }),
        };
        const res = await fetch(
          isNew
            ? "/api/leadership/training/materials"
            : `/api/leadership/training/materials/${editing}`,
          {
            method: isNew ? "POST" : "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        );
        if (!res.ok) {
          setError(materialMessage(await res.json().catch(() => ({}))));
          return;
        }
        close();
        router.refresh();
      } catch {
        setError("Falha de rede. Tente de novo.");
      }
    });
  }

  return (
    <div className="grid gap-6">
      <div>
        {editing !== "new" ? (
          <Button type="button" onClick={openNew}>
            Nova matéria
          </Button>
        ) : (
          <MaterialForm
            heading="Nova matéria"
            form={form}
            set={set}
            isNew
            onSubmit={submit}
            onCancel={close}
            pending={pending}
            error={error}
          />
        )}
      </div>

      {loadError ? (
        <Card className="text-brand-muted">
          Não deu pra carregar as matérias agora ({loadError}). Atualize a página.
        </Card>
      ) : materials.length === 0 ? (
        <Card className="text-brand-muted">
          Nenhuma matéria criada ainda. Crie a primeira acima.
        </Card>
      ) : (
        <ul className="grid gap-4">
          {materials.map((m) => (
            <li key={m.external_id}>
              {editing === m.external_id ? (
                <MaterialForm
                  heading="Editar matéria"
                  form={form}
                  set={set}
                  isNew={false}
                  onSubmit={submit}
                  onCancel={close}
                  pending={pending}
                  error={error}
                />
              ) : (
                <Card>
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-display text-lg">{m.title}</h2>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="muted">{kindLabel(m.kind)}</Badge>
                      {m.blocking && <Badge tone="warn">Obrigatória</Badge>}
                      <Badge tone={m.active ? "ok" : "muted"}>
                        {m.active ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-brand-muted">Questão: {m.question}</p>
                  {(m.content_blocks?.length ?? 0) > 0 && (
                    <p className="mt-1 text-xs text-brand-muted">
                      Esta matéria tem {m.content_blocks.length} bloco(s) de conteúdo rico
                      (preservados ao editar aqui).
                    </p>
                  )}
                  <div className="mt-4">
                    <Button type="button" variant="ghost" onClick={() => openEdit(m)}>
                      Editar
                    </Button>
                  </div>
                </Card>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MaterialForm({
  heading,
  form,
  set,
  isNew,
  onSubmit,
  onCancel,
  pending,
  error,
}: {
  heading: string;
  form: FormState;
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  isNew: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  pending: boolean;
  error: string | null;
}) {
  return (
    <Card>
      <h2 className="font-display text-base">{heading}</h2>
      <div className="mt-4 space-y-3">
        <label className={LABEL_CLS} htmlFor="m-title">
          Título
        </label>
        <input
          id="m-title"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          className={INPUT_CLS}
          placeholder="Ex: Política de captação"
        />

        <label className={LABEL_CLS} htmlFor="m-text">
          Conteúdo (texto)
        </label>
        <textarea
          id="m-text"
          value={form.text_content}
          onChange={(e) => set("text_content", e.target.value)}
          rows={4}
          className={INPUT_CLS}
          placeholder="O texto que o promotor lê antes de responder"
        />

        <label className={LABEL_CLS} htmlFor="m-question">
          Questão
        </label>
        <textarea
          id="m-question"
          value={form.question}
          onChange={(e) => set("question", e.target.value)}
          rows={2}
          className={INPUT_CLS}
          placeholder="A pergunta que o promotor responde"
        />

        <label className={LABEL_CLS} htmlFor="m-answer">
          Gabarito
        </label>
        <textarea
          id="m-answer"
          value={form.expected_answer}
          onChange={(e) => set("expected_answer", e.target.value)}
          rows={2}
          className={INPUT_CLS}
          placeholder="Resposta esperada — a IA compara a resposta do promotor com isto"
        />

        <label className={LABEL_CLS} htmlFor="m-kind">
          Tipo
        </label>
        <select
          id="m-kind"
          value={form.kind}
          onChange={(e) => set("kind", e.target.value)}
          className={INPUT_CLS}
        >
          {MATERIAL_KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>

        <label className={LABEL_CLS} htmlFor="m-order">
          Ordem
        </label>
        <input
          id="m-order"
          value={form.order}
          onChange={(e) => set("order", e.target.value)}
          inputMode="numeric"
          className={INPUT_CLS}
          placeholder="0"
        />

        <label className="flex items-center gap-2 text-sm text-brand-ink">
          <input
            type="checkbox"
            checked={form.blocking}
            onChange={(e) => set("blocking", e.target.checked)}
          />
          Obrigatória (trava o painel do promotor até ser aprovada)
        </label>

        {!isNew && (
          <label className="flex items-center gap-2 text-sm text-brand-ink">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => set("active", e.target.checked)}
            />
            Ativa
          </label>
        )}

        <div className="flex flex-wrap gap-3 pt-1">
          <Button type="button" onClick={onSubmit} loading={pending}>
            {pending ? "Salvando…" : isNew ? "Criar matéria" : "Salvar alterações"}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            Cancelar
          </Button>
        </div>

        <FieldError>{error}</FieldError>
      </div>
    </Card>
  );
}
