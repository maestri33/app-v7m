import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

const mockBackend = "http://127.0.0.1:8765";
const fixture = {
  name: "identity.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    readFileSync(resolve("tests/fixtures/identity.png.base64"), "utf8").trim(),
    "base64",
  ),
};

test("telefone → OTP → cadastro → treinamento → painel", async ({ page, request }) => {
  test.setTimeout(90_000);
  await request.post(`${mockBackend}/__reset`);

  await page.goto("/");
  await page.getByLabel(/telefone/i).fill("11999990001");
  await page.getByRole("button", { name: /continuar/i }).click();
  await page.getByLabel(/Código de 6 dígitos/i).fill("000000");
  await page.getByRole("button", { name: /entrar/i }).click();

  await expect(page).toHaveURL(/\/perfil$/);
  const profileSave = page.getByRole("button", { name: /Salvar e continuar/i });
  await expect(profileSave).toBeEnabled();
  await page.getByLabel("Nome da mãe").fill("Maria E2E");
  await page.getByLabel("Nome do pai").fill("José E2E");
  await page.getByLabel(/Naturalidade/).fill("São Paulo/SP");
  await page.getByLabel("Estado civil").selectOption("single");
  await page.getByLabel("Nacionalidade").fill("brasileira");
  const [profileResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/me/profile") &&
        response.request().method() === "POST",
      { timeout: 45_000 },
    ),
    profileSave.click(),
  ]);
  expect(profileResponse.ok()).toBeTruthy();

  await expect(page).toHaveURL(/\/endereco$/, { timeout: 30_000 });
  const searchCep = page.getByRole("button", { name: /Buscar CEP/i });
  await expect(searchCep).toBeEnabled();
  await page.getByLabel("CEP").fill("01310100");
  await expect(page.getByLabel("CEP")).toHaveValue("01310-100");
  const [addressResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/me/address") &&
        response.request().method() === "POST",
      { timeout: 45_000 },
    ),
    searchCep.click(),
  ]);
  expect(addressResponse.ok()).toBeTruthy();
  await page.getByLabel("Número").fill("1000");
  await page.getByRole("button", { name: /Salvar e continuar/i }).click();

  await expect(page).toHaveURL(/\/documento$/);
  await page.getByLabel("RG").check();
  await page.locator('input[type="file"][accept="image/*,application/pdf"]').setInputFiles(fixture);

  await expect(page).toHaveURL(/\/pix$/, { timeout: 15_000 });
  await page.getByLabel("Chave").fill("e2e-promotor@v7m.test");
  await page.getByRole("button", { name: /Validar chave/i }).click();

  await expect(page).toHaveURL(/\/escolaridade$/);
  await page.getByLabel("Ensino médio").check();
  await page.getByLabel("Já concluí esse nível").check();
  await page.getByRole("button", { name: /Salvar e continuar/i }).click();

  await expect(page).toHaveURL(/\/selfie$/);
  await page.getByRole("button", { name: /Li e concordo/i }).click();
  await page.locator('input[type="file"][capture="user"]').setInputFiles(fixture);
  await page.getByRole("button", { name: /Tirar selfie e assinar/i }).click();

  await expect(page).toHaveURL(/\/treinamento$/);
  await page.getByRole("link", { name: /Abrir e responder/i }).click();
  await page.getByLabel("Sua resposta").fill(
    "Eu explicaria o curso com clareza, sem prometer aprovação ou emprego.",
  );
  await page.getByRole("button", { name: /Enviar resposta/i }).click();

  await expect(page).toHaveURL(/\/painel$/, { timeout: 15_000 });
  await expect(page.getByText(/Olá, Promotor E2E V7M/i)).toBeVisible();
  await expect(page.getByText("Seu link", { exact: true })).toBeVisible();
});
