import { test, expect } from "@playwright/test";

// O backend devolve `otp_sent` honesto (false quando rate-limitado ou o dispatch
// falhou). O front NUNCA pode prometer "mandamos o código" nesse caso.
// Stub da rota — não toca no backend nem dispara WhatsApp real.
test.describe("app-v7m · OTP honesto", () => {
  const phone = "11987654321";

  async function submitPhone(page: import("@playwright/test").Page) {
    await page.goto("/");
    await page.getByLabel(/telefone/i).fill(phone);
    await page.getByRole("button", { name: /continuar/i }).click();
  }

  test("otp_sent:true → promete o código", async ({ page }) => {
    await page.route("**/api/auth/check", (route) =>
      route.fulfill({
        json: { found: true, external_id: "u-1", otp_sent: true, otp_wait: null },
      }),
    );
    await submitPhone(page);
    await expect(page.getByText(/Mandamos um código/i)).toBeVisible();
  });

  test("otp_sent:false → não promete o código", async ({ page }) => {
    await page.route("**/api/auth/check", (route) =>
      route.fulfill({
        json: { found: true, external_id: "u-1", otp_sent: false, otp_wait: 45 },
      }),
    );
    await submitPhone(page);
    await expect(page.getByText(/Não conseguimos enviar um código/i)).toBeVisible();
    await expect(page.getByText(/Mandamos um código/i)).toHaveCount(0);
  });

  test("OTP_NOT_SENT → fica no telefone, com o motivo", async ({ page }) => {
    await page.route("**/api/auth/check", (route) =>
      route.fulfill({
        status: 502,
        json: { detail: "falha no dispatch", code: "OTP_NOT_SENT" },
      }),
    );
    await submitPhone(page);
    await expect(page.getByText(/Confira se esse número tem WhatsApp ativo/i)).toBeVisible();
    // não avançou pra tela de código
    await expect(page.getByLabel(/^Código$/i)).toHaveCount(0);
  });
});
