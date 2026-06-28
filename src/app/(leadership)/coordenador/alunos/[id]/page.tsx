import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/ui/page-header";
import { AlunoDetailBody } from "@/components/leadership/AlunoDetailBody";
import { AlunoActions } from "@/components/leadership/AlunoActions";
import { djangoFetch, DjangoError } from "@/lib/api/client";
import { LEADERSHIP, type StudentDetail } from "@/lib/api/leadership";

export const dynamic = "force-dynamic";
export const metadata = { title: "Aluno" };

// GET /leadership/students/{id} → HubStudentDetailOut (TIPADO em api/leadership.py).
// O render vive em AlunoDetailBody (presentational, dá pra ver no /dev-preview). As
// decisões (corrigir prova, abrir/resolver pendência, liberar documentação, emitir
// diploma) vivem no AlunoActions, que posta nos route handlers com cookie. Decidir
// documento em revisão é disparado pela fila de Revisões (que leva o documento).
export default async function AlunoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let data: StudentDetail | null = null;
  let errorCode: string | null = null;
  try {
    data = await djangoFetch<StudentDetail>(`${LEADERSHIP}/students/${id}`);
  } catch (e) {
    errorCode = e instanceof DjangoError ? e.body.code : "ERROR";
  }

  const name =
    data && typeof data.user?.name === "string" ? data.user.name : "Aluno";

  return (
    <Container className="py-10">
      <Link
        href="/coordenador/alunos"
        className="inline-flex items-center min-h-11 text-sm text-brand-muted hover:text-brand-ink transition-colors"
      >
        ← Alunos
      </Link>

      <PageHeader kicker="V7M · Coordenador" title={name} />

      <AlunoDetailBody data={data} errorCode={errorCode} />

      {!errorCode && data && (
        <div className="mt-6">
          <AlunoActions data={data} />
        </div>
      )}
    </Container>
  );
}
