import { expect, test, type Page } from "@playwright/test";

async function openPreview(page: Page) {
  await page.goto("/dev-preview/escolaridade-prototype", { waitUntil: "networkidle" });
  await expect(page.getByLabel("Resposta sobre sua escolaridade")).toBeVisible();
}

test.describe("componente conversacional de escolaridade", () => {
  test("recupera resposta incompreendida, ano inválido e cidade inventada", async ({ page }) => {
    await openPreview(page);
    await page.getByLabel("Resposta sobre sua escolaridade").fill("não sei");
    await page.getByRole("button", { name: "Enviar" }).click();
    await expect(page.getByText("Hmm, essa parte eu não peguei… me explica de novo?")).toBeVisible();

    await page.getByLabel("Resposta sobre sua escolaridade").fill("parei na 8ª série");
    await page.getByRole("button", { name: "Enviar" }).click();
    await page.getByRole("button", { name: "7º ano", exact: true }).click();
    await page.getByLabel("Ano").fill("1949");
    await page.getByRole("button", { name: "Enviar" }).click();
    await expect(page.getByText(/Informe um ano entre 1950/)).toBeVisible();

    await page.getByLabel("Ano").fill("2024");
    await page.getByRole("button", { name: "Enviar" }).click();
    await page.getByRole("textbox", { name: "Cidade", exact: true }).fill("Cidade Inventada");
    await page.getByRole("button", { name: "Buscar cidade" }).click();
    await expect(page.getByText("Escolha uma cidade da lista — ou pule por agora.")).toBeVisible();
    await page.getByRole("button", { name: "não sei agora · continuar sem cidade" }).click();
    await expect(page.getByRole("dialog", { name: "Revise sua escolaridade" })).toBeVisible();
  });

  test("interpreta superior em andamento e produz resultado estruturado", async ({ page }) => {
    await openPreview(page);
    await page.getByLabel("Resposta sobre sua escolaridade").fill("estou fazendo mestrado");
    await page.getByRole("button", { name: "Enviar" }).click();
    await page.getByRole("button", { name: "Graduação", exact: true }).click();
    await page.getByLabel("Ano").fill("2025");
    await page.getByRole("button", { name: "Enviar" }).click();
    await page.getByRole("textbox", { name: "Cidade", exact: true }).fill("Po");
    await page.getByRole("option", { name: "Ponta Grossa – PR" }).click();
    await page.getByRole("button", { name: "Isso!" }).click();
    await page.getByLabel("Nome da escola (opcional)").fill("Faculdade Exemplo");
    await page.getByRole("button", { name: "Enviar" }).click();
    await page.getByRole("button", { name: "Tá certo!" }).click();

    await expect(page.getByText("Fechou! Já anotei tudo aqui.")).toBeVisible();
    await expect(page.getByLabel("Resultado estruturado")).toContainText('"qualification": "mestrado"');
    await expect(page.getByLabel("Resultado estruturado")).toContainText('"lastCompletedQualification": "graduacao"');
  });

  test("mantém as respostas quando o salvamento falha", async ({ page }) => {
    await openPreview(page);
    await page.getByRole("button", { name: "Falha ao salvar" }).click();
    await page.getByLabel("Resposta sobre sua escolaridade").fill("terminei o ensino médio");
    await page.getByRole("button", { name: "Enviar" }).click();
    await page.getByLabel("Ano").fill("2023");
    await page.getByRole("button", { name: "Enviar" }).click();
    await page.getByRole("button", { name: "não sei agora · continuar sem cidade" }).click();
    await page.getByRole("button", { name: "Tá certo!" }).click();

    await expect(page.locator("p[role='alert']")).toContainText("suas respostas continuam aqui");
    await expect(page.getByRole("dialog", { name: "Revise sua escolaridade" })).toBeVisible();
  });

  test("mantém a composição no celular e respeita movimento reduzido", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openPreview(page);

    const component = page.locator('section[aria-labelledby="education-title"]');
    expect((await component.boundingBox())?.width).toBeLessThanOrEqual(370);
    const reducedDuration = await component.locator("button").first().evaluate((element) => Number.parseFloat(getComputedStyle(element).animationDuration));
    expect(reducedDuration).toBeLessThanOrEqual(0.00001);
  });
});
