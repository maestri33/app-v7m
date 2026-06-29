import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/ui/page-header";
import { TreinamentoEditor } from "@/components/leadership/TreinamentoEditor";
import { djangoFetch, DjangoError } from "@/lib/api/client";
import { LEADERSHIP, type Material } from "@/lib/api/leadership";

export const dynamic = "force-dynamic";
export const metadata = { title: "Treinamento" };

// GET /leadership/training/materials → MaterialOut[] (com gabarito; visão de autoria,
// api/leadership.py). O coordenador também autora matéria do treino (mesmo contrato
// do staff). A criação/edição vive no TreinamentoEditor (client), que posta nos route
// handlers com cookie. Define o que trava o painel dos promotores (blocking).
export default async function TreinamentoPage() {
  let materials: Material[] = [];
  let loadError: string | null = null;
  try {
    materials = await djangoFetch<Material[]>(`${LEADERSHIP}/training/materials`);
  } catch (e) {
    loadError = e instanceof DjangoError ? e.body.code : "ERROR";
  }

  return (
    <Container className="py-10">
      <PageHeader
        kicker="V7M · Coordenador"
        title="Treinamento"
        subtitle="Autore as matérias do treino: conteúdo, questão e gabarito. Matéria obrigatória trava o painel do promotor até ser aprovada."
      />

      <TreinamentoEditor materials={materials} loadError={loadError} />
    </Container>
  );
}
