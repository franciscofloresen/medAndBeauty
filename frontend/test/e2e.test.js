const { test, expect } = require('@playwright/test');

test.describe('medAndBeauty E2E', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('https://distribuidoramedandbeauty.com');
    await expect(page).toHaveTitle(/Med & Beauty/);
  });

  test('should search products', async ({ page }) => {
    await page.goto('https://distribuidoramedandbeauty.com');
    await page.fill('[data-testid="search-input"]', 'crema');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('.product-card')).toBeVisible();
  });

  test('should navigate to product detail', async ({ page }) => {
    await page.goto('https://distribuidoramedandbeauty.com');
    await page.click('.product-card:first-child');
    await expect(page.locator('.product-detail')).toBeVisible();
  });
});
