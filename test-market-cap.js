const fetch = require('node-fetch');
const axios = require('axios');
const { parse } = require('csv-parse/sync');

async function getIssuedShares(companyId) {
    const url = 'https://mops.twse.com.tw/mops/api/t05st03';
    const payload = {
        companyId: companyId
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const commonStockAmountString = data.result.commonStockAmount.value;
        const match = commonStockAmountString.match(/([\d,]+)股/);

        if (match && match[1]) {
            const commonStockAmount = parseInt(match[1].replace(/,/g, ''), 10);
            console.log(`Company ID: ${companyId}`);
            console.log(`Total Issued Shares: ${commonStockAmount.toLocaleString()}`);
            return commonStockAmount;
        } else {
            console.log('Could not parse commonStockAmount from response.');
            return null;
        }
    } catch (error) {
        console.error('Error fetching issued shares:', error);
        return null;
    }
}

async function getLatestPrice(stockId) {
    try {
        const response = await axios.get('https://www.twse.com.tw/exchangeReport/STOCK_DAY_ALL?response=open_data');
        const csvData = response.data;
        
        // The first line is a header, and there might be blank lines at the end.
        const records = parse(csvData, {
            columns: false, 
            skip_empty_lines: true,
            from_line: 2 // Skip header line
        });

        const stockData = records.find(item => item[0] === stockId);
        
        if (stockData) {
            const price = parseFloat(stockData[8]);
            console.log(`Stock ID: ${stockId}`);
            console.log(`Latest Price: ${price}`);
            return price;
        }
         else {
            console.error('Error fetching stock price: Stock not found');
            return null;
        }
    } catch (error) {
        console.error('Error fetching stock price:', error);
        return null;
    }
}

async function testMarketCap(companyId) {
    const issuedShares = await getIssuedShares(companyId);
    if (issuedShares === null) {
        return;
    }

    const latestPrice = await getLatestPrice(companyId);
    if (latestPrice === null) {
        return;
    }

    const marketCap = issuedShares * latestPrice;
    console.log(`
Market Capitalization for ${companyId}:`);
    console.log(`  Issued Shares: ${issuedShares.toLocaleString()}`);
    console.log(`  Latest Price: ${latestPrice.toLocaleString()}`);
    console.log(`  Market Cap: NT$ ${marketCap.toLocaleString()}`);
}

// Test with companyId "6857" as requested
testMarketCap('6857');
// Test with TSMC as another example
testMarketCap('2330');
