const { test, expect } = require('@playwright/test');

test.describe('Default Data on Initial Load', () => {
  test('should display pre-loaded data for default companies on page load', async ({ page }) => {
    // Increase the timeout for the initial load and data fetch, which can be slow.
    test.setTimeout(60000); // 60 seconds

    // 1. Navigate to the application's root URL.
    await page.goto('http://localhost:3001');

    // --- VERIFICATION ---

    // 2. Verify Pre-filled Inputs
    // Wait for the first input to be populated to ensure the DOM script has run.
    await expect(page.locator('#companySearch1')).toHaveValue('6841 - 長佳智能', { timeout: 10000 });
    await expect(page.locator('#companySearch2')).toHaveValue('6857 - 宏碁智醫');
    
    // Also check the hidden input codes
    await expect(page.locator('#companyCode1')).toHaveValue('6841');
    await expect(page.locator('#companyCode2')).toHaveValue('6857');

    // 3. Verify Chart Rendering
    // Wait for the charts container to be visible, indicating the API call finished.
    await expect(page.locator('#chartsContainer')).toBeVisible({ timeout: 30000 });
    
    // Check that the individual chart canvases are present.
    await expect(page.locator('#monthlyChart')).toBeVisible();
    await expect(page.locator('#monthlyYoYChart')).toBeVisible();

    // 4. Verify Data Table Population
    // Check that the data table is visible.
    await expect(page.locator('#dataTableContainer')).toBeVisible();
    
    // Check that the table body is not empty and has at least one data row.
    const tableBodyRowCount = await page.locator('#dataTableBody tr').count();
    expect(tableBodyRowCount).toBeGreaterThan(0);

    // 5. Verify Market Cap Display
    // Check that the market cap sections for both companies are visible.
    await expect(page.locator('#marketCap1')).toBeVisible();
    await expect(page.locator('#marketCap2')).toBeVisible();

    // Check for specific content within the market cap display to confirm it's rendered correctly.
    await expect(page.locator('#marketCap1')).toContainText('TWD (億)');
    await expect(page.locator('#marketCap2')).toContainText('TWD (億)');
    
    // 6. Verify Company Name Display
    await expect(page.locator('#companyName1')).toContainText('長佳智能 (6841)');
    await expect(page.locator('#companyName2')).toContainText('宏碁智醫 (6857)');

    // 7. Check for success message
    await expect(page.locator('.success-message')).toContainText('Data loaded successfully.');
  });
});
