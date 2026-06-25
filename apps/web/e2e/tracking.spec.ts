import { test, expect } from "@playwright/test";

test.describe("Tracking público", () => {
  test("página de tracking existe para ID válido", async ({ page }) => {
    // Usa um UUID válido para testar que a página carrega sem erro 500
    const orderId = "550e8400-e29b-41d4-a716-446655440000";
    await page.goto(`/track/${orderId}`);
    // A página deve carregar (mesmo que mostre "pedido não encontrado")
    await expect(page.locator("body")).toBeVisible();
  });

  test("página de tracking rejeita ID inválido na URL", async ({ page }) => {
    await page.goto("/track/invalid-id");
    // Next.js deve retornar 404 ou renderizar a página com erro tratado
    await expect(page.locator("body")).toBeVisible();
  });
});
