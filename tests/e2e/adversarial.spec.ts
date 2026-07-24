import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test, type Page } from "@playwright/test";

const mockBackend = process.env.MOCK_BACKEND_URL ?? "http://127.0.0.1:8765";
const fixture = {
  name: "identity.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    readFileSync(resolve("tests/fixtures/identity.png.base64"), "utf8").trim(),
    "base64",
  ),
};

async function openOtp(page: Page) {
  await page.goto("/");
  await page.getByLabel(/telefone/i).fill("11999990001");
  await page.getByRole("button", { name: /continuar/i }).click();
}

async function login(page: Page) {
  await openOtp(page);
  await page.getByLabel(/Código de 6 dígitos/i).fill("000000");
  await page.getByRole("button", { name: /entrar/i }).click();
}

test("OTP errado permite corrigir sem solicitar outro código", async ({ page, request }) => {
  await request.post(`${mockBackend}/__reset`);
  await openOtp(page);
  await request.post(`${mockBackend}/__fail-next-login`);

  const otp = page.getByLabel(/Código de 6 dígitos/i);
  await otp.fill("111111");
  await page.getByRole("button", { name: /entrar/i }).click();

  await expect(page.getByText(/Código incorreto/i)).toBeVisible();
  await expect(otp).toHaveValue("111111");
  await otp.fill("000000");
  await page.getByRole("button", { name: /entrar/i }).click();
  await expect(page).toHaveURL(/\/documento$/);
});

test("Pix rejeitado preserva a chave e permite nova tentativa", async ({ page, request }) => {
  await request.post(`${mockBackend}/__reset`);
  await request.post(`${mockBackend}/__stage?status=pix`);
  await login(page);
  await expect(page).toHaveURL(/\/pix$/);
  await request.post(`${mockBackend}/__fail-next-pix`);

  const key = page.getByRole("textbox", { name: "Chave Pix" });
  await key.fill("promotor@v7m.test");
  await page.getByRole("button", { name: "Estou ciente" }).click();
  await page.getByRole("button", { name: "Validar chave" }).click();

  await expect(page.getByText(/Essa chave não apareceu no seu CPF/i)).toBeVisible();
  await expect(key).toHaveValue("promotor@v7m.test");
  await page.getByRole("button", { name: "Validar chave" }).click();
  await expect(page).toHaveURL(/\/escolaridade$/);
});

test("falha temporária e reprovação de selfie permitem refazer", async ({ page, request }) => {
  await request.post(`${mockBackend}/__reset`);
  await request.post(`${mockBackend}/__stage?status=selfie&pix=1&education=1`);
  await login(page);
  await expect(page).toHaveURL(/\/selfie$/);
  const agreement = page.locator('[class*="agreement"]');
  await agreement.evaluate((element) => element.scrollTo(0, element.scrollHeight));
  await page.getByRole("button", { name: "Li e aceito o acordo" }).click();

  const selfie = page.locator('input[type="file"][capture="user"]');
  await selfie.setInputFiles(fixture);
  await request.post(`${mockBackend}/__fail-next-selfie`);
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(page.getByText(/Tivemos um problema aqui do nosso lado/i)).toBeVisible();
  await expect(page).toHaveURL(/\/selfie$/);

  await request.post(`${mockBackend}/__selfie-outcome?status=rejected`);
  await page.getByRole("button", { name: "Enviar novamente" }).click();
  await expect(page.getByText(/Rosto parcialmente fora do enquadramento/i)).toBeVisible();
  await page.getByRole("button", { name: "Tirar nova selfie" }).click();

  await request.post(`${mockBackend}/__selfie-outcome?status=approved`);
  await selfie.setInputFiles(fixture);
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(page).toHaveURL(/\/treinamento$/);
});

test("erro no treinamento mantém a resposta e permite reenviar", async ({ page, request }) => {
  await request.post(`${mockBackend}/__reset`);
  await login(page);
  await expect(page).toHaveURL(/\/documento$/);
  await request.post(`${mockBackend}/__approve`);
  const refreshResponse = await page.request.post("/api/auth/refresh");
  expect(refreshResponse.ok()).toBeTruthy();
  await page.goto("/treinamento");
  await page.getByRole("link", { name: /Abrir e responder/i }).click();
  await request.post(`${mockBackend}/__fail-next-training`);

  const answer = page.getByLabel("Sua resposta");
  const text = "Eu explicaria a proposta com clareza e sem prometer aprovação.";
  await answer.fill(text);
  await page.getByRole("button", { name: "Enviar resposta" }).click();

  await expect(page.getByText(/resposta anterior ainda está sendo corrigida/i)).toBeVisible();
  await expect(answer).toHaveValue(text);
  await page.getByRole("button", { name: "Enviar resposta" }).click();
  await expect(page).toHaveURL(/\/painel$/);
});

test("sessão sem access usa o refresh e preserva o fluxo", async ({ page, request, context }) => {
  await request.post(`${mockBackend}/__reset`);
  await login(page);
  await expect(page).toHaveURL(/\/documento$/);

  const cookies = await context.cookies();
  const refresh = cookies.find((cookie) => cookie.name === "v7m_refresh");
  expect(refresh).toBeDefined();
  await context.clearCookies();
  await context.addCookies([refresh!]);

  const response = await context.request.post("/api/me/education/assistant", {
    data: {
      message: "Parei no segundo ano do ensino médio.",
      draft: {},
      history: [],
    },
  });

  expect(response.ok()).toBeTruthy();
  expect((await context.cookies()).some((cookie) => cookie.name === "v7m_access")).toBeTruthy();
});
