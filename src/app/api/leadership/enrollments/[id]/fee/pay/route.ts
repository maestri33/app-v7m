/**
 * POST /api/leadership/enrollments/[id]/fee/pay — coordenador cola o QR Pix da
 * 1ª parcela (à vista) obtido na plataforma parceira, e nosso app dispara o
 * pagamento via Asaas/DICT. Decisão L2, **mexe em dinheiro real da empresa**.
 * Proxy do backend `POST /api/v1/leadership/enrollments/{external_id}/fee/pay`
 * com body `FeeIn` `{ qr_code, amount? }`. djangoFetch injeta o Bearer do
 * cookie HttpOnly; o client nunca toca no token.
 */
import { NextResponse } from "next/server";

import { djangoFetch, DjangoError } from "@/lib/api/client";
import { djangoErrorResponse } from "@/lib/api/django-error";
import {
  LEADERSHIP,
  type FeeIn,
  type EnrollmentFees,
} from "@/lib/api/leadership";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const raw = (await req.json().catch(() => ({}))) as Partial<FeeIn>;
    const qr_code = typeof raw.qr_code === "string" ? raw.qr_code.trim() : "";
    if (!qr_code) {
      return NextResponse.json(
        { detail: "Cole o QR Pix da 1ª parcela.", code: "FEE_QR_INVALID" },
        { status: 422 },
      );
    }
    const body: FeeIn = {
      qr_code,
      ...(typeof raw.amount === "string" && raw.amount.trim()
        ? { amount: raw.amount.trim() }
        : {}),
    };
    const data = await djangoFetch<EnrollmentFees>(
      `${LEADERSHIP}/enrollments/${id}/fee/pay`,
      { method: "POST", body: JSON.stringify(body) },
    );
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof DjangoError) return djangoErrorResponse(err);
    return NextResponse.json(
      { detail: "Falha ao pagar a 1ª parcela.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}