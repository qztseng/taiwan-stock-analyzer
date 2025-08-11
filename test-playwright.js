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

        // 1. Fill out Company 1 (TSMC)
        console.log('Typing "2330" for Company 1...');
        await page.fill('#companySearch1', '2330');
        await page.waitForSelector('#suggestions1 div');
        console.log('Suggestions for Company 1 appeared. Clicking first result.');
        await page.click('#suggestions1 div:first-child');
        const companyCode1 = await page.inputValue('#companyCode1');
        assert.strictEqual(companyCode1, '2330', 'Company code 1 should be set to 2330');
        console.log('✅ Company 1 (2330) selected.');

        // 2. Fill out Company 2 (Hon Hai)
        console.log('Typing "2317" for Company 2...');
        await page.fill('#companySearch2', '2317');
        await page.waitForSelector('#suggestions2 div');
        console.log('Suggestions for Company 2 appeared. Clicking first result.');
        await page.click('#suggestions2 div:first-child');
        const companyCode2 = await page.inputValue('#companyCode2');
        assert.strictEqual(companyCode2, '2317', 'Company code 2 should be set to 2317');
        console.log('✅ Company 2 (2317) selected.');

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
        assert.ok(companyName1Text.includes('2330'), 'Company 1 name should be displayed');
        assert.ok(companyName2Text.includes('2317'), 'Company 2 name should be displayed');
        console.log('✅ Company name displays are correct.');

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