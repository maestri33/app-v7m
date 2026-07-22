import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const mockBackend = process.env.MOCK_BACKEND_URL ?? "http://127.0.0.1:8765";

async function openEducation(page: Page, request: APIRequestContext) {
  await request.post(`${mockBackend}/__reset`);
  await page.goto("/");
  await page.getByLabel(/telefone/i).fill("11999990001");
  await page.getByRole("button", { name: /continuar/i }).click();
  await page.getByLabel(/Código de 6 dígitos/i).fill("000000");
  await page.getByRole("button", { name: /entrar/i }).click();
  await expect(page).toHaveURL(/\/documento$/);
  await request.post(`${mockBackend}/__stage?status=pix&pix=1`);
  await page.goto("/escolaridade");
}

test("conversa prepara resumo sem controles genéricos do CopilotKit", async ({ page, request }) => {
  await openEducation(page, request);

  await page.getByLabel("Resposta sobre sua escolaridade").fill("Parei no 8º ano em 2010, em Curitiba.");
  await page.getByRole("button", { name: "Enviar resposta" }).click();

  await expect(page.getByText("Confira o que entendemos", { exact: true })).toBeVisible();
  await expect(page.getByText("8º ano", { exact: true })).toBeVisible();
  await expect(page.getByText("Parei antes de terminar", { exact: true })).toBeVisible();
  await expect(page.getByText("2010", { exact: true })).toBeVisible();
  await expect(page.getByText("Curitiba", { exact: true })).toBeVisible();
  await expect(page.getByText("9º ano", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Confirmar e continuar" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Stop" })).toHaveCount(0);
  await expect(page.getByText("Powered by CopilotKit")).toHaveCount(0);
});

test("entende nomenclatura escolar antiga sem reduzir a série", async ({ page, request }) => {
  await openEducation(page, request);

  await page
    .getByLabel("Resposta sobre sua escolaridade")
    .fill("Concluí a antiga 8ª série em 2004.");
  await page.getByRole("button", { name: "Enviar resposta" }).click();

  await expect(page.getByText("Ensino Fundamental", { exact: true })).toBeVisible();
  await expect(page.getByText("9º ano", { exact: true })).toBeVisible();
  await expect(page.getByText("Concluí essa série/ano", { exact: true })).toBeVisible();
  await expect(page.getByText("2004", { exact: true })).toBeVisible();
  await expect(page.getByText("8º ano", { exact: true })).toHaveCount(0);
});

test("continua a conversa usando rascunho estruturado e histórico curto", async ({ page, request }) => {
  const requests: Array<{
    draft?: { level?: string; grade?: number; educationStatus?: string; year?: string };
    history?: Array<{ role: string; content: string }>;
  }> = [];
  await page.route("**/api/me/education/assistant", async (route) => {
    requests.push(route.request().postDataJSON());
    const firstTurn = requests.length === 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        reply: firstTurn
          ? "Em que ano você parou nessa série?"
          : "Entendi. Confira o resumo abaixo antes de continuar.",
        ready: !firstTurn,
        draft: {
          level: "fundamental",
          grade: 8,
          education_status: "stopped",
          year: firstTurn ? null : 2010,
          city: "",
          school: "",
        },
      }),
    });
  });
  await openEducation(page, request);

  const input = page.getByLabel("Resposta sobre sua escolaridade");
  await input.fill("Parei no 8º ano.");
  await page.getByRole("button", { name: "Enviar resposta" }).click();
  await expect(page.getByText("Em que ano você parou nessa série?", { exact: true })).toBeVisible();
  await input.fill("Em 2010.");
  await page.getByRole("button", { name: "Enviar resposta" }).click();

  await expect(page.getByText("Confira o que entendemos", { exact: true })).toBeVisible();
  expect(requests[1].draft).toMatchObject({
    level: "fundamental",
    grade: 8,
    educationStatus: "stopped",
    year: "",
  });
  expect(requests[1].history?.at(-1)).toEqual({
    role: "assistant",
    content: "Em que ano você parou nessa série?",
  });
});

test("escolaridade continua pelas opções quando a IA estiver indisponível", async ({ page, request }) => {
  await page.route("**/api/me/education/assistant", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "offline" }) }),
  );
  await openEducation(page, request);

  await expect(page.getByText("Assistente de escolaridade", { exact: true })).toBeVisible();
  await page.getByLabel("Resposta sobre sua escolaridade").fill("Parei no 8º ano.");
  await page.getByRole("button", { name: "Enviar resposta" }).click();
  await expect(page.getByText("O assistente não respondeu agora.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Continuar pelas opções" }).click();
  await page.getByText("Ensino médio", { exact: true }).click();
  await page.getByText("1º médio", { exact: true }).click();
  await page.getByText("Parei antes de terminar", { exact: true }).click();
  await expect(page.getByRole("button", { name: "Confirmar e continuar" })).toBeEnabled();
  await page.getByRole("button", { name: "Confirmar e continuar" }).click();
  await expect(page.getByText(/Informe um ano entre 1950/)).toBeVisible();
  await page.getByLabel("Em que ano parou de estudar?").fill("2024");
  await page.getByLabel("Cidade onde estudou (opcional)").fill("Ponta Grossa");
  await page.getByRole("button", { name: "Confirmar e continuar" }).click();

  await expect(page).toHaveURL(/\/selfie$/);
});

test("rascunho manual sobrevive ao recarregamento", async ({ page, request }) => {
  await openEducation(page, request);
  await page.getByRole("button", { name: "Responder por opções" }).click();
  await page.getByText("Fundamental", { exact: true }).click();
  await page.getByText("8º ano", { exact: true }).click();
  await page.getByText("Ainda estou cursando", { exact: true }).click();
  await page.getByLabel("Em que ano começou a cursar essa série?").fill("2026");
  await page.getByLabel("Nome da escola (opcional)").fill("Escola Exemplo");
  await page.reload();
  await page.getByRole("button", { name: "Responder por opções" }).click();

  await expect(page.getByLabel("Em que ano começou a cursar essa série?")).toHaveValue("2026");
  await expect(page.getByLabel("Nome da escola (opcional)")).toHaveValue("Escola Exemplo");
  await expect(page.getByText("8º ano", { exact: true })).toBeVisible();
});
