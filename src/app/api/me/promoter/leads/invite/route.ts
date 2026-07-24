import { NextResponse } from "next/server";

import { djangoFetch, DjangoError } from "@/lib/api/client";
import { djangoErrorResponse } from "@/lib/api/django-error";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { phone?: string; cpf?: string };
    const data = await djangoFetch(
      "/api/v1/collaborators/promoter/me/leads/invite",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: body.phone ?? "", cpf: body.cpf ?? "" }),
      },
    );
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof DjangoError) return djangoErrorResponse(error);
    return NextResponse.json(
      { detail: "Falha ao enviar o convite.", code: "INTERNAL" },
      { status: 500 },
    );
  }
}
