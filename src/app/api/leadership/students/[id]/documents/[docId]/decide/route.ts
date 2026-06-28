/**
 * POST /api/leadership/students/[id]/documents/[docId]/decide — coordenador decide
 * (aprovar/reprovar) um documento do aluno que a IA mandou pra REVISÃO. Decisão L2,
 * afeta identidade. Proxy do backend
 * `POST /api/v1/leadership/students/{external_id}/documents/{document_external_id}/decide`
 * com body `DocDecideIn` `{ approve, reason? }`. djangoFetch injeta o Bearer do
 * cookie HttpOnly; o client nunca toca no token.
 */
import { NextResponse } from "next/server";

import { djangoFetch, DjangoError } from "@/lib/api/client";
import { djangoErrorResponse } from "@/lib/api/django-error";
import { LEADERSHIP, type DocDecideIn } from "@/lib/api/leadership";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const { id, docId } = await params;
  try {
    const raw = (await req.json().catch(() => ({}))) as Partial<DocDecideIn>;
    const approve = raw.approve === true;
    const reason = typeof raw.reason === "string" ? raw.reason.trim() : null;
    if (!approve && !reason) {
      return NextResponse.json(
        { detail: "Explique por que o documento foi recusado.", code: "DESCRIPTION_REQUIRED" },
        { status: 422 },
      );
    }
    const body: DocDecideIn = { approve, reason };
    const data = await djangoFetch(
      `${LEADERSHIP}/students/${id}/documents/${docId}/decide`,
      { method: "POST", body: JSON.stringify(body) },
    );
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof DjangoError) return djangoErrorResponse(err);
    return NextResponse.json(
      { detail: "Falha ao decidir o documento.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}
