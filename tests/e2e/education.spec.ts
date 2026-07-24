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

async function sendText(page: Page, label: string | RegExp, value: string) {
  await page.getByLabel(label).fill(value);
  await page.getByRole("button", { name: "Enviar" }).click();
}

test("escolaridade usa o assistente conversacional aprovado", async ({ page, request }) => {
  await openEducation(page, request);

  await expect(page.getByRole("heading", { name: "Até onde você estudou?" })).toBeVisible();
  await expect(page.getByLabel("Resposta sobre sua escolaridade")).toBeVisible();
  await expect(page.getByText("Formação", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ensino Fundamental" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Conversar" })).toHaveCount(0);
});

test("recupera resposta inválida antes de seguir", async ({ page, request }) => {
  await openEducation(page, request);

  await sendText(page, "Resposta sobre sua escolaridade", "não lembro de nada");
  await expect(page.getByText("Hmm, essa parte eu não peguei… me explica de novo?")).toBeVisible();

  await sendText(page, "Resposta sobre sua escolaridade", "terminei o ensino médio");
  await expect(page.getByLabel("Ano")).toBeVisible();
});

test("salva corretamente fundamental incompleto", async ({ page, request }) => {
  await openEducation(page, request);
  await sendText(page, "Resposta sobre sua escolaridade", "parei no 7º ano");
  await page.getByRole("button", { name: "5º ano" }).click();
  await sendText(page, "Ano", "2003");
  await page.getByRole("button", { name: "não sei agora · continuar sem cidade" }).click();

  const educationRequest = page.waitForRequest((pendingRequest) =>
    pendingRequest.url().endsWith("/api/me/education") && pendingRequest.method() === "POST",
  );
  await page.getByRole("button", { name: "Tá certo!" }).click();
  const payload = (await educationRequest).postDataJSON();

  expect(payload).toMatchObject({
    level: "fundamental",
    grade: 7,
    last_completed_grade: 5,
    education_status: "stopped",
    completed: false,
    city: null,
    school: null,
  });
  await expect(page).toHaveURL(/\/selfie$/);
});

test("superior distingue formação frequentada da concluída", async ({ page, request }) => {
  await openEducation(page, request);
  await sendText(page, "Resposta sobre sua escolaridade", "parei no mestrado");
  await page.getByRole("button", { name: "Graduação", exact: true }).click();
  await sendText(page, "Ano", "2024");
  await page.getByRole("button", { name: "não sei agora · continuar sem cidade" }).click();

  const educationRequest = page.waitForRequest((pendingRequest) =>
    pendingRequest.url().endsWith("/api/me/education") && pendingRequest.method() === "POST",
  );
  await page.getByRole("button", { name: "Tá certo!" }).click();
  const payload = (await educationRequest).postDataJSON();

  expect(payload).toMatchObject({
    level: "superior",
    grade: null,
    qualification: "mestrado",
    last_completed_qualification: "graduacao",
    education_status: "stopped",
    completed: false,
  });
  await expect(page).toHaveURL(/\/selfie$/);
});

test("cidade listada e escola opcional entram no payload", async ({ page, request }) => {
  await openEducation(page, request);
  await sendText(page, "Resposta sobre sua escolaridade", "estou fazendo graduação");
  await page.getByRole("button", { name: "Nenhuma" }).click();
  await sendText(page, "Ano", "2025");
  await page.getByRole("textbox", { name: "Cidade", exact: true }).fill("Cur");
  await page.getByRole("option", { name: "Curitiba – PR" }).click();
  await page.getByRole("button", { name: "Isso!" }).click();
  await sendText(page, "Nome da escola (opcional)", "Universidade Exemplo");

  const educationRequest = page.waitForRequest((pendingRequest) =>
    pendingRequest.url().endsWith("/api/me/education") && pendingRequest.method() === "POST",
  );
  await page.getByRole("button", { name: "Tá certo!" }).click();
  const payload = (await educationRequest).postDataJSON();

  expect(payload).toMatchObject({
    level: "superior",
    qualification: "graduacao",
    last_completed_qualification: null,
    education_status: "attending",
    city: "Curitiba - PR",
    school: "Universidade Exemplo",
  });
  await expect(page).toHaveURL(/\/selfie$/);
});
