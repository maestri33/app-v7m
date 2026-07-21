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
