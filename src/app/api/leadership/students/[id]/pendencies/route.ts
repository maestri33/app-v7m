/**
 * POST /api/leadership/students/[id]/pendencies — coordenador abre uma pendência
 * (documento OU taxa) → aluno vai pra PENDING. `amount_cents` é só registro (NÃO
 * move dinheiro aqui). Decisão L2, afeta status real. Proxy do backend
 * `POST /api/v1/leadership/students/{external_id}/pendencies` com body `PendencyIn`
 * `{ kind, description, amount_cents? }`. djangoFetch injeta o Bearer do cookie
 * HttpOnly; o client nunca toca no token.
 */
import { NextResponse } from "next/server";

import { djangoFetch, DjangoError } from "@/lib/api/client";
import { djangoErrorResponse } from "@/lib/api/django-error";
import { LEADERSHIP, type PendencyIn } from "@/lib/api/leadership";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const raw = (await req.json().catch(() => ({}))) as Partial<PendencyIn>;
    const kind = raw.kind === "fee" || raw.kind === "document" ? raw.kind : null;
    const description = typeof raw.description === "string" ? raw.description.trim() : "";
    if (!kind || !description) {
      return NextResponse.json(
        { detail: "Escolha o tipo da pendência e descreva o que falta.", code: "DESCRIPTION_REQUIRED" },
        { status: 422 },
      );
    }
    const body: PendencyIn = {
      kind,
      description,
      ...(kind === "fee" && typeof raw.amount_cents === "number"
        ? { amount_cents: raw.amount_cents }
        : {}),
    };
    const data = await djangoFetch(`${LEADERSHIP}/students/${id}/pendencies`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof DjangoError) return djangoErrorResponse(err);
    return NextResponse.json(
      { detail: "Falha ao abrir a pendência.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}
