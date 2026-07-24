import { expect, test } from "@playwright/test";

test.describe("componente de e-mail do promotor", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dev-preview/email-prototype");
  });

  test("explica e permite corrigir um e-mail inválido", async ({ page }) => {
    const input = page.getByRole("textbox", { name: "E-mail" });

    await input.fill("email-incompleto");
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page.getByText("E-mail inválido.", { exact: true })).toBeVisible();
    await expect(input).toBeFocused();
    await expect(page.getByTestId("email-step")).toHaveAttribute("data-phase", "input");
  });

  test("recupera um endereço já vinculado", async ({ page }) => {
    await page.getByRole("button", { name: "Já em uso" }).click();
    const input = page.getByRole("textbox", { name: "E-mail" });
    await input.fill("usado@exemplo.com");
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page.getByTestId("email-step")).toHaveAttribute("data-phase", "checking");
    await expect(page.getByRole("dialog")).toContainText("E-mail já em uso");
    await page.getByRole("button", { name: "Usar outro e-mail" }).click();

    await expect(input).toHaveValue("");
    await expect(input).toBeFocused();
  });

  test("mantém o e-mail após uma falha de rede", async ({ page }) => {
    await page.getByRole("button", { name: "Erro de rede" }).click();
    const input = page.getByRole("textbox", { name: "E-mail" });
    await input.fill("victor@exemplo.com");
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page.getByRole("dialog")).toContainText("Não foi possível verificar");
    await page.getByRole("button", { name: "Revisar e-mail" }).click();

    await expect(input).toHaveValue("victor@exemplo.com");
    await expect(input).toBeFocused();
  });

  test("conclui a animação de sucesso", async ({ page }) => {
    await page.getByRole("textbox", { name: "E-mail" }).fill("novo@exemplo.com");
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page.getByText("Verificando…")).toBeVisible();
    await expect(page.getByText("E-mail confirmado!")).toBeVisible();
    await expect(page.getByRole("status")).toContainText("Fluxo concluído");
  });
});
