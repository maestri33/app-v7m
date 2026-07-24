import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

const mockBackend = process.env.MOCK_BACKEND_URL ?? "http://127.0.0.1:8765";
const fixture = {
  name: "identity.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    readFileSync(resolve("tests/fixtures/identity.png.base64"), "utf8").trim(),
    "base64",
  ),
};
const proofFixture = {
  name: "proof.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF"),
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
  await page.getByRole("button", { name: "RG" }).click();
  await page.getByRole("button", { name: "Tirar foto" }).click();
  await page.getByRole("button", { name: "OK, abrir câmera" }).click();
  const documentInput = page.locator('input[type="file"][capture="environment"]');
  await documentInput.setInputFiles(fixture);
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(page.getByText(/Não conseguimos confirmar o documento agora/i)).toBeVisible();

  await request.post(`${mockBackend}/__classify?document=0`);
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(page.getByText(/Essa imagem não parece ser um documento/i)).toBeVisible();
  await expect(page).toHaveURL(/\/documento$/);

  await request.post(`${mockBackend}/__classify?document=1&completeness=front&legible=0`);
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(page.getByText(/imagem está desfocada/i)).toBeVisible();
  await expect(page).toHaveURL(/\/documento$/);

  await request.post(`${mockBackend}/__classify?document=1&completeness=front&legible=1`);
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(page.getByRole("dialog").getByText(/VERSO do RG/i)).toBeVisible();
  await page.getByRole("button", { name: "OK, abrir câmera" }).click();

  await request.post(`${mockBackend}/__classify?document=1&completeness=front&legible=0`);
  await documentInput.setInputFiles(fixture);
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(page.getByText(/parece ser a FRENTE do RG/i)).toBeVisible();
  await expect(page).toHaveURL(/\/documento$/);

  await request.post(`${mockBackend}/__classify?document=1&completeness=back&legible=1`);
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(page).toHaveURL(/\/endereco$/);

  await request.post(`${mockBackend}/__fail-next-proof`);
  await page.getByRole("button", { name: "Enviar arquivo" }).click();
  const proofInput = page.locator('input[type="file"][accept*="application/pdf"]');
  await proofInput.setInputFiles(proofFixture);
  await expect(page.getByText(/Falha temporária ao armazenar/i)).toBeVisible();
  await expect(page).toHaveURL(/\/endereco$/);

  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(page).toHaveURL(/\/pix$/);
});
