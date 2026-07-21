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

test("erros de documento e comprovante permitem corrigir sem recomeçar", async ({
  page,
  request,
}) => {
  await request.post(`${mockBackend}/__reset`);
  await page.goto("/");
  await page.getByLabel(/telefone/i).fill("11999990001");
  await page.getByRole("button", { name: /continuar/i }).click();
  await page.getByLabel(/Código de 6 dígitos/i).fill("000000");
  await page.getByRole("button", { name: /entrar/i }).click();
  await expect(page).toHaveURL(/\/documento$/);

  await request.post(`${mockBackend}/__fail-next-classify`);
  await page.getByLabel("RG").check();
  const documentInput = page.locator('input[type="file"][accept="image/*,application/pdf"]');
  await documentInput.setInputFiles(fixture);
  await expect(page.getByText(/Não conseguimos confirmar o documento agora/i)).toBeVisible();
  await expect(page.getByText(/Primeiro envie a FRENTE do RG/i)).toBeVisible();

  await request.post(`${mockBackend}/__classify?document=0`);
  await documentInput.setInputFiles(fixture);
  await expect(page.getByText(/Essa imagem não parece ser um documento/i)).toBeVisible();
  await expect(page).toHaveURL(/\/documento$/);

  await request.post(`${mockBackend}/__classify?document=1`);
  await documentInput.setInputFiles(fixture);
  await expect(page.getByText(/VERSO do RG/i)).toBeVisible();
  await documentInput.setInputFiles(fixture);
  await expect(page).toHaveURL(/\/endereco$/);

  await request.post(`${mockBackend}/__fail-next-proof`);
  const proofInput = page.locator('input[type="file"][accept="image/*,application/pdf"]');
  await proofInput.setInputFiles(fixture);
  await expect(page.getByText(/Falha temporária ao armazenar/i)).toBeVisible();
  await expect(page).toHaveURL(/\/endereco$/);

  await proofInput.setInputFiles(fixture);
  await expect(page).toHaveURL(/\/pix$/);
});
