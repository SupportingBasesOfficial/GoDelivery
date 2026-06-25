import { test, expect } from "@playwright/test";

test.describe("Páginas públicas", () => {
  test("página inicial carrega sem erros", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/GoDelivery/);
    await expect(page.locator("text=Gerencie suas entregas")).toBeVisible();
    await expect(page.locator("text=Começar grátis")).toBeVisible();
  });

  test("página de login renderiza formulário", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText("Entrar");
  });

  test("página de cadastro renderiza formulário completo", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator('input[name="fullName"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="phone"]')).toBeVisible();
    await expect(page.locator('input[name="tenantName"]')).toBeVisible();
    await expect(page.locator('input[name="tenantSlug"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirm_password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText("Criar conta");
  });

  test("link de cadastro na página de login funciona", async ({ page }) => {
    await page.goto("/login");
    await page.click('text=Cadastre-se');
    await expect(page).toHaveURL(/.*register.*/);
  });

  test("link de login na página de cadastro funciona", async ({ page }) => {
    await page.goto("/register");
    await page.click('text=Entre aqui');
    await expect(page).toHaveURL(/.*login.*/);
  });
});
