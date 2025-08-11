const { chromium } = require('playwright');
const path = require('path');
const assert = require('assert');

(async () => {
    console.log('🚀 Starting Playwright test for Taiwan Stock Analyzer V2...');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Log console messages from the page
    page.on('console', msg => console.log(`[Browser Console] ${msg.text()}`));

    try {
        const pageUrl = 'http://localhost:3001';
        console.log(`Navigating to: ${pageUrl}`);
        await page.goto(pageUrl);

        // --- Test Case: Fetch and Compare Two Companies ---

        // 1. Fill out Company 1 (6841)
        console.log('Typing "6841" for Company 1...');
        await page.fill('#companySearch1', '6841');
        await page.waitForSelector('#suggestions1 div');
        console.log('Suggestions for Company 1 appeared. Clicking first result.');
        await page.click('#suggestions1 div:first-child');
        const companyCode1 = await page.inputValue('#companyCode1');
        assert.strictEqual(companyCode1, '6841', 'Company code 1 should be set to 6841');
        console.log('✅ Company 1 (6841) selected.');

        // 2. Fill out Company 2 (6857)
        console.log('Typing "6857" for Company 2...');
        await page.fill('#companySearch2', '6857');
        await page.waitForSelector('#suggestions2 div');
        console.log('Suggestions for Company 2 appeared. Clicking first result.');
        await page.click('#suggestions2 div:first-child');
        const companyCode2 = await page.inputValue('#companyCode2');
        assert.strictEqual(companyCode2, '6857', 'Company code 2 should be set to 6857');
        console.log('✅ Company 2 (6857) selected.');

        // 3. Set the start date
        const testDate = '2023-01';
        console.log(`Setting start date to ${testDate}...`);
        await page.fill('#startDate', testDate);

        // 4. Click the fetch button
        console.log('Clicking "Fetch & Compare" button...');
        await page.click('#fetchBtn');

        // 5. Wait for results and assert
        console.log('Waiting for charts to render...');
        await page.waitForSelector('#monthlyChart', { timeout: 90000 }); // Increased timeout for slow API
        console.log('Charts container is visible.');

        // Assert Company Name displays are visible
        await page.waitForSelector('#companyName1:not([style*="display: none"])');
        await page.waitForSelector('#companyName2:not([style*="display: none"])');
        const companyName1Text = await page.textContent('#companyName1');
        const companyName2Text = await page.textContent('#companyName2');
        assert.ok(companyName1Text.includes('6841'), 'Company 1 name should be displayed');
        assert.ok(companyName2Text.includes('6857'), 'Company 2 name should be displayed');
        console.log('✅ Company name displays are correct.');

        // Assert Market Cap displays are visible and correctly formatted
        await page.waitForSelector('#marketCap1:not([style*="display: none"])');
        await page.waitForSelector('#marketCap2:not([style*="display: none"])');
        
        const marketCap1HTML = await page.innerHTML('#marketCap1');
        assert.ok(marketCap1HTML.includes('Market Cap.'), 'Market Cap 1 should contain "Market Cap."');
        assert.ok(marketCap1HTML.includes('TWD'), 'Market Cap 1 should contain "TWD"');
        assert.ok(marketCap1HTML.includes('USD'), 'Market Cap 1 should contain "USD"');
        assert.ok(marketCap1HTML.includes('Total issued share:'), 'Market Cap 1 should contain "Total issued share:"');
        assert.ok(marketCap1HTML.includes('Latest price:'), 'Market Cap 1 should contain "Latest price:"');
        assert.ok(!marketCap1HTML.includes('NaN'), 'Market Cap 1 USD value should not be NaN.');
        console.log('✅ Market Cap 1 display is correct.');

        const marketCap2HTML = await page.innerHTML('#marketCap2');
        assert.ok(marketCap2HTML.includes('Market Cap.'), 'Market Cap 2 should contain "Market Cap."');
        assert.ok(marketCap2HTML.includes('TWD'), 'Market Cap 2 should contain "TWD"');
        assert.ok(marketCap2HTML.includes('USD'), 'Market Cap 2 should contain "USD"');
        assert.ok(marketCap2HTML.includes('Total issued share:'), 'Market Cap 2 should contain "Total issued share:"');
        assert.ok(marketCap2HTML.includes('Latest price:'), 'Market Cap 2 should contain "Latest price:"');
        assert.ok(!marketCap2HTML.includes('NaN'), 'Market Cap 2 USD value should not be NaN.');
        console.log('✅ Market Cap 2 display is correct.');

        // Assert that the chart has been rendered with two datasets
        const chartInfo = await page.evaluate(() => {
            const chart = Chart.getChart("monthlyChart");
            return {
                hasChart: !!chart,
                datasetCount: chart ? chart.data.datasets.length : 0,
                labelsCount: chart ? chart.data.labels.length : 0
            };
        });

        assert.ok(chartInfo.hasChart, 'The monthly revenue chart should be rendered.');
        assert.strictEqual(chartInfo.datasetCount, 2, 'The chart should contain 2 datasets for comparison.');
        assert.ok(chartInfo.labelsCount > 0, 'The chart should have date labels.');
        console.log(`✅ Monthly chart rendered with ${chartInfo.datasetCount} datasets.`);

        // Assert that the data table has rows
        const tableRows = await page.locator('#dataTableBody tr').count();
        assert.ok(tableRows > 0, 'The data table should be populated with rows.');
        console.log(`✅ Data table rendered with ${tableRows} rows.`);

        console.log('🎉 Test Passed!');

    } catch (error) {
        console.error('❌ Test Failed:', error);
        await page.screenshot({ path: 'test-failure-screenshot.png' });
        console.log('📸 Screenshot saved to test-failure-screenshot.png');
        process.exit(1); // Exit with error code
    } finally {
        await browser.close();
    }
})();