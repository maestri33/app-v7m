/**
 * POST /api/leadership/promoters/[id]/materials/[materialId]/approve — coordenador
 * aprova uma matéria EM ABERTO de um promotor travado no treino (destrava quem não
 * tem prática digital). Decisão L2, afeta acesso real. `id` = external_id do
 * promotor; `materialId` = external_id da matéria. Proxy do backend
 * `POST /api/v1/leadership/promoters/{external_id}/materials/{material_external_id}/approve`
 * (sem body). djangoFetch injeta o Bearer do cookie HttpOnly; o client nunca toca
 * no token.
 */
import { NextResponse } from "next/server";

import { djangoFetch, DjangoError } from "@/lib/api/client";
import { djangoErrorResponse } from "@/lib/api/django-error";
import { LEADERSHIP, type MaterialApprove } from "@/lib/api/leadership";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; materialId: string }> },
) {
  const { id, materialId } = await params;
  try {
    const data = await djangoFetch<MaterialApprove>(
      `${LEADERSHIP}/promoters/${id}/materials/${materialId}/approve`,
      { method: "POST" },
    );
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof DjangoError) return djangoErrorResponse(err);
    return NextResponse.json(
      { detail: "Falha ao aprovar a matéria.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}
