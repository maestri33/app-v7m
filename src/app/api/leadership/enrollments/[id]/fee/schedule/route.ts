/**
 * POST /api/leadership/enrollments/[id]/fee/schedule — coordenador cola o QR Pix
 * da 2ª parcela (com vencimento ~30d) obtido na plataforma parceira. O app
 * agenda o pagamento via Asaas/DICT. **Mexe em dinheiro real da empresa** (sai
 * da conta da V7M no vencimento). QR sem vencimento → `FEE_QR_NO_DUE_DATE` (422).
 * Independe do `fee/pay` — só `conclude` exige ambos pagos.
 * Proxy do backend `POST /api/v1/leadership/enrollments/{external_id}/fee/schedule`
 * com body `FeeIn` `{ qr_code, amount? }`.
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
        { detail: "Cole o QR Pix da 2ª parcela (com vencimento).", code: "FEE_QR_INVALID" },
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
      `${LEADERSHIP}/enrollments/${id}/fee/schedule`,
      { method: "POST", body: JSON.stringify(body) },
    );
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof DjangoError) return djangoErrorResponse(err);
    return NextResponse.json(
      { detail: "Falha ao agendar a 2ª parcela.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}