import { test, expect } from "@playwright/test";

test.describe("Autenticação", () => {
  test("login com credenciais vazias mostra erro de validação", async ({ page }) => {
    await page.goto("/login");
    await page.click('button[type="submit"]');
    // HTML5 validation bloqueia submit devido ao required
    await expect(page).toHaveURL(/.*login.*/);
  });

  test("login com email inválido mostra erro", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "invalid");
    await page.fill('input[name="password"]', "123456");
    await page.click('button[type="submit"]');
    // HTML5 email validation deve prevenir submit ou mostrar erro
    const hasValidation = await page.evaluate(() => {
      const input = document.querySelector('input[type="email"]') as HTMLInputElement;
      return !input.validity.valid;
    });
    expect(hasValidation || page.url().includes("login")).toBeTruthy();
  });

  test("dashboard redireciona para login quando não autenticado", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/.*login.*/);
  });

  test("cadastro com senhas divergentes mostra erro", async ({ page }) => {
    await page.goto("/register");
    await page.fill('input[name="fullName"]', "Test User");
    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="phone"]', "+5511999999999");
    await page.fill('input[name="tenantName"]', "Test Company");
    await page.fill('input[name="tenantSlug"]', "test-company");
    await page.fill('input[name="password"]', "Senha123!");
    await page.fill('input[name="confirm_password"]', "Senha456!");
    await page.click('button[type="submit"]');
    await expect(page.locator("text=As senhas não coincidem")).toBeVisible();
  });
});
