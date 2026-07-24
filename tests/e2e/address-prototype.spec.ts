import { expect, test } from "@playwright/test";

const validPdf = {
  name: "comprovante.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF"),
};

test.describe("componente de comprovante de endereço", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dev-preview/endereco-prototype");
  });

  test("troca entre câmera e arquivo sem sair da etapa", async ({ page }) => {
    await page.getByRole("button", { name: "Tirar foto" }).click();
    await expect(page.getByText("Encaixe o comprovante inteiro")).toBeVisible();
    await page.getByRole("button", { name: "Trocar método" }).click();
    await page.getByRole("button", { name: "Enviar arquivo" }).click();
    await expect(page.getByRole("button", { name: /Toque para anexar/ })).toBeVisible();
  });

  test("preserva a composição compacta do protótipo", async ({ page }) => {
    await page.setViewportSize({ width: 910, height: 1214 });
    const cardBox = await page.getByTestId("address-proof-card").boundingBox();
    const illustrationBox = await page.getByTestId("address-proof-illustration").boundingBox();
    const photoBox = await page.getByRole("button", { name: "Tirar foto" }).boundingBox();
    const fileBox = await page.getByRole("button", { name: "Enviar arquivo" }).boundingBox();
    const backBox = await page.getByRole("button", { name: "Voltar" }).boundingBox();

    expect(cardBox?.width).toBe(420);
    expect(cardBox!.height).toBeLessThanOrEqual(470);
    expect(illustrationBox?.width).toBeCloseTo(170, 2);
    expect(photoBox?.y).toBe(fileBox?.y);
    expect(backBox!.y).toBeGreaterThan(cardBox!.y + cardBox!.height);
  });

  test("rejeita formato inválido e permite escolher outro", async ({ page }) => {
    await page.getByRole("button", { name: "Enviar arquivo" }).click();
    await page.locator('input[type="file"]').nth(1).setInputFiles({ name: "comprovante.txt", mimeType: "text/plain", buffer: Buffer.from("texto") });
    await expect(page.getByTestId("address-proof-experience").getByRole("alert")).toContainText("Formato não aceito");
    await expect(page.getByRole("button", { name: "Tentar novamente" })).toHaveCount(0);
    await page.getByRole("button", { name: "Escolher outro" }).click();
    await expect(page.getByRole("button", { name: /Toque para anexar/ })).toBeVisible();
  });

  test("mantém arquivo selecionado e recupera falha de rede", async ({ page }) => {
    await page.getByRole("button", { name: "Falha de rede" }).click();
    await page.getByRole("button", { name: "Enviar arquivo" }).click();
    await page.locator('input[type="file"]').nth(1).setInputFiles(validPdf);
    await expect(page.getByTestId("address-proof-experience").getByRole("alert")).toContainText("arquivo continua selecionado");
    await page.getByRole("button", { name: "Sucesso" }).click();
    await page.getByRole("button", { name: "Enviar arquivo" }).click();
    await page.locator('input[type="file"]').nth(1).setInputFiles(validPdf);
    await expect(page.getByText("Comprovante recebido")).toBeVisible();
  });

  test("cancela envio atrasado ao trocar método", async ({ page }) => {
    await page.getByRole("button", { name: "Enviar arquivo" }).click();
    await page.locator('input[type="file"]').nth(1).setInputFiles(validPdf);
    await expect(page.getByTestId("address-proof-experience").getByRole("status")).toContainText("Validando e enviando arquivo…");
    await page.getByRole("button", { name: "Trocar método" }).click();
    await expect(page.getByRole("button", { name: "Tirar foto" })).toBeVisible();
    await page.waitForTimeout(1100);
    await expect(page.getByText("Comprovante recebido")).toHaveCount(0);
  });

  test("conclui envio válido e avança após confirmação", async ({ page }) => {
    await page.getByRole("button", { name: "Enviar arquivo" }).click();
    await page.locator('input[type="file"]').nth(1).setInputFiles(validPdf);
    await expect(page.getByText("Comprovante recebido")).toBeVisible();
    await expect(page.getByText("Endereço encaminhado")).toBeVisible();
  });

  test("ocupa a tela móvel sem criar rolagem horizontal", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dev-preview/endereco-prototype");
    const card = page.getByTestId("address-proof-experience");
    const box = await card.boundingBox();

    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    expect(box!.width).toBeGreaterThanOrEqual(360);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.getByRole("button", { name: "Tirar foto" }).click();
    await expect(page.getByText("Encaixe o comprovante inteiro")).toBeVisible();
  });
});
