import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const mockBackend = process.env.MOCK_BACKEND_URL ?? "http://127.0.0.1:8765";

async function openPromoter(page: Page, request: APIRequestContext) {
  await request.post(`${mockBackend}/__reset`);
  await request.post(`${mockBackend}/__promoter`);
  await page.goto("/");
  await page.getByLabel(/telefone/i).fill("11999990001");
  await page.getByRole("button", { name: /continuar/i }).click();
  await page.getByLabel(/Código de 6 dígitos/i).fill("000000");
  await page.getByRole("button", { name: /entrar/i }).click();
  await expect(page).toHaveURL(/\/painel$/);
}

test("painel mostra leads e convite se recupera de erro", async ({ page, request }) => {
  await openPromoter(page, request);

  await expect(page.getByText("1 aguardando · 1 pagas", { exact: true })).toBeVisible();
  await expect(page.getByText("Maria da Silva", { exact: true })).toBeVisible();
  await expect(page.getByText("João Pereira", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Matricular" }).click();
  await expect(page.getByRole("dialog", { name: "Matricular uma pessoa" })).toBeVisible();
  await page.getByLabel("Telefone com DDD").fill("43999999999");
  await page.getByLabel("CPF").fill("52998224725");
  await request.post(`${mockBackend}/__fail-next-invite`);
  await page.getByRole("button", { name: "Enviar convite" }).click();

  await expect(page.getByText("Digite um CPF válido.", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Telefone com DDD")).toHaveValue("43999999999");
  await expect(page.getByLabel("CPF")).toHaveValue("52998224725");

  await page.getByRole("button", { name: "Enviar convite" }).click();
  await expect(page.getByText("Convite encaminhado", { exact: true })).toBeVisible();
  await expect(page.getByText(/terminado em 9999/)).toBeVisible();
});
