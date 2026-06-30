/**
 * POST /api/leadership/students/[id]/diploma/pickup — coordenador posta a FOTO do
 * aluno recebendo o diploma → aluno vira VETERANO (promoção). Decisão L2,
 * irreversível, afeta status real. Proxy multipart do backend
 * `POST /api/v1/leadership/students/{external_id}/diploma/pickup` (campo `file`).
 * djangoFetch injeta o Bearer do cookie HttpOnly; o client nunca toca no token.
 */
import { NextResponse } from "next/server";

import { djangoFetch, DjangoError } from "@/lib/api/client";
import { djangoErrorResponse } from "@/lib/api/django-error";
import { LEADERSHIP } from "@/lib/api/leadership";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { detail: "Anexe a foto da retirada.", code: "PICKUP_FILE_REQUIRED" },
        { status: 422 },
      );
    }
    const upstream = new FormData();
    upstream.append("file", file, file.name);
    const data = await djangoFetch(
      `${LEADERSHIP}/students/${id}/diploma/pickup`,
      { method: "POST", body: upstream as unknown as BodyInit },
    );
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof DjangoError) return djangoErrorResponse(err);
    return NextResponse.json(
      { detail: "Falha ao registrar a retirada.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}
