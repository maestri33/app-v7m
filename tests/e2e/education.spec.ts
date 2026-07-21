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

async function mockEducationToolRace(page: Page) {
  await page.route("**/api/copilotkit", async (route) => {
    const payload = route.request().postDataJSON() as {
      method?: string;
      body?: { threadId?: string; runId?: string };
    };

    if (payload.method === "info") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          version: "1.63.1",
          agents: {
            default: {
              name: "default",
              description: "",
              className: "TestAgent",
              capabilities: {
                tools: { supported: true, clientProvided: true },
                transport: { streaming: true },
              },
            },
          },
          mode: "sse",
        }),
      });
      return;
    }

    const threadId = payload.body?.threadId ?? "thread-e2e";
    const runId = payload.body?.runId ?? "run-e2e";
    const toolCallId = "call-education-e2e";
    const events = [
      { type: "RUN_STARTED", threadId, runId },
      {
        type: "TOOL_CALL_START",
        toolCallId,
        toolCallName: "prepararEscolaridade",
        parentMessageId: "assistant-e2e",
      },
      {
        type: "TOOL_CALL_ARGS",
        toolCallId,
        delta: JSON.stringify({
          level: "fundamental",
          grade: 8,
          education_status: "stopped",
          year: 2010,
          city: "Curitiba",
          school: "",
        }),
      },
      { type: "TOOL_CALL_END", toolCallId },
      { type: "RUN_FINISHED", threadId, runId },
    ];

    await route.fulfill({
      status: 200,
      contentType: "text/event-stream; charset=utf-8",
      headers: { "cache-control": "no-cache" },
      body: events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""),
    });
  });
}

test("libera confirmação mesmo quando o runtime encerra junto da ferramenta", async ({ page, request }) => {
  await mockEducationToolRace(page);
  await openEducation(page, request);

  await page.getByPlaceholder("Ex.: parei no 8º ano…").fill("Parei no 8º ano em 2010, em Curitiba.");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByText("Resumo preparado", { exact: true })).toBeVisible();
  await expect(page.getByText("8º ano · Parei antes de terminar", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmar e continuar" })).toBeEnabled();
});

test("escolaridade continua pelas opções quando a IA estiver indisponível", async ({ page, request }) => {
  await page.route("**/api/copilotkit", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "offline" }) }),
  );
  await openEducation(page, request);

  await expect(page.getByText("Assistente de escolaridade", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Responder por opções" }).click();
  await page.getByText("Ensino médio", { exact: true }).click();
  await page.getByText("1º médio", { exact: true }).click();
  await page.getByText("Parei antes de terminar", { exact: true }).click();
  await page.getByLabel("Em que ano foi isso?").fill("2024");
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
  await page.getByLabel("Em que ano foi isso?").fill("2026");
  await page.getByLabel("Nome da escola (opcional)").fill("Escola Exemplo");
  await page.reload();
  await page.getByRole("button", { name: "Responder por opções" }).click();

  await expect(page.getByLabel("Em que ano foi isso?")).toHaveValue("2026");
  await expect(page.getByLabel("Nome da escola (opcional)")).toHaveValue("Escola Exemplo");
  await expect(page.getByText("8º ano", { exact: true })).toBeVisible();
});
