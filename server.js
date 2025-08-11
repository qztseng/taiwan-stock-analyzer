const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { initializeDatabase, getDb } = require('./database.js');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// --- Utility Functions ---

function toMinguoYear(year) {
    return year - 1911;
}

function generateMonths(startYear, startMonth) {
    const current = new Date();
    let year = startYear;
    let month = startMonth;
    const months = [];
    // Go up to the most recently completed month.
    const end = new Date(current.getFullYear(), current.getMonth(), 0); // Last day of previous month
    const endYear = end.getFullYear();
    const endMonth = end.getMonth() + 1;


    while (year < endYear || (year === endYear && month <= endMonth)) {
        months.push([year, month]);
        month += 1;
        if (month > 12) {
            year += 1;
            month = 1;
        }
    }
    return months;
}

function parseAPIResponse(apiResponse, year, month) {
    if (!apiResponse || !apiResponse.result || !apiResponse.result.data) {
        console.warn(`[Parser] Invalid API response structure for ${year}-${month}`, apiResponse);
        return null;
    }

    const data = apiResponse.result.data;
    const companyName = apiResponse.result.companyAbbreviation;

    const findValue = (key) => {
        const item = data.find(d => d[0] === key);
        const value = item ? item[1] : null;
        return value ? value.replace(/,/g, '') : null;
    };

    const revenueStr = findValue('本月');
    const lastYearRevenueStr = findValue('去年同期');
    const ytdRevenueStr = findValue('本年累計');

    if (revenueStr === null) {
        console.warn(`[Parser] '本月' (current month revenue) not found for ${year}-${month}`);
        return null;
    }

    const revenue = parseFloat(revenueStr);
    const lastYearRevenue = parseFloat(lastYearRevenueStr);
    const ytdRevenue = parseFloat(ytdRevenueStr);

    const revenueInMillions = revenue / 1000;
    const ytdRevenueInMillions = ytdRevenue / 1000;

    const yoyPercent = lastYearRevenue > 0 ? ((revenue - lastYearRevenue) / lastYearRevenue) * 100 : null;

    return {
        companyName: companyName,
        year: year,
        month: month,
        revenue: revenueInMillions,
        yoy_percent: yoyPercent,
        ytd_revenue: ytdRevenueInMillions
    };
}


// --- API Endpoints ---

// --- Market Cap Functions ---
async function getIssuedShares(companyId) {
    const url = 'https://mops.twse.com.tw/mops/api/t05st03';
    const payload = { companyId: companyId };
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
            },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            return null;
        }
        const data = await response.json();
        if (data.result && data.result.commonStockAmount && data.result.commonStockAmount.value) {
            const commonStockAmountStr = data.result.commonStockAmount.value;
            // Robustly parse the number of shares by taking the part before '股'
            const sharesStr = commonStockAmountStr.split('股')[0].replace(/,/g, '');
            const shares = parseInt(sharesStr, 10);
            
            if (isNaN(shares)) {
                console.error(`[Shares] Failed to parse shares from string: "${commonStockAmountStr}"`);
                return null;
            }
            return shares;
        }
    } catch (error) {
        console.error('Error fetching issued shares:', error);
        return null;
    }
}

async function getStockPrice(stockNo) {
    const parseMinguoDate = (minguoDateStr) => {
        if (!minguoDateStr || typeof minguoDateStr !== 'string') return 'N/A';
        let cleanDateStr = minguoDateStr.replace(/\//g, '');
        if (cleanDateStr.length < 7) return minguoDateStr;
        const year = parseInt(cleanDateStr.substring(0, 3), 10) + 1911;
        const month = cleanDateStr.substring(3, 5);
        const day = cleanDateStr.substring(5, 7);
        return `${year}-${month}-${day}`;
    };

    // Source 1: TPEx Mainboard (OTC)
    try {
        const url = 'https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes';
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            const stock = data.find(s => s.SecuritiesCompanyCode === stockNo);
            if (stock && stock.Average && !isNaN(parseFloat(stock.Average))) {
                console.log(`[Stock Price] Found ${stockNo} in TPEx OTC.`);
                return { price: parseFloat(stock.Average), date: parseMinguoDate(stock.Date) };
            }
        }
    } catch (e) { console.error(`[Stock Price] Error fetching TPEx OTC data: ${e.message}`); }

    // Source 2: TPEx Emerging Market
    try {
        const url = 'https://www.tpex.org.tw/openapi/v1/tpex_esb_latest_statistics';
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            const stock = data.find(s => s.SecuritiesCompanyCode === stockNo);
            if (stock && stock.PreviousAveragePrice && !isNaN(parseFloat(stock.PreviousAveragePrice))) {
                console.log(`[Stock Price] Found ${stockNo} in TPEx Emerging.`);
                return { price: parseFloat(stock.PreviousAveragePrice), date: parseMinguoDate(stock.Date) };
            }
        }
    } catch (e) { console.error(`[Stock Price] Error fetching TPEx Emerging data: ${e.message}`); }

    // Source 3: TWSE Listed
    try {
        const url = 'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_AVG_ALL';
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            const stock = data.find(s => s.Code === stockNo);
            if (stock && stock.ClosingPrice && !isNaN(parseFloat(stock.ClosingPrice))) {
                console.log(`[Stock Price] Found ${stockNo} in TWSE.`);
                const date = new Date();
                const year = date.getFullYear();
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                // Note: This API provides daily data but the date isn't in the response, so we use the current date.
                return { price: parseFloat(stock.ClosingPrice), date: `${year}-${month}-${date.getDate()}` };
            }
        }
    } catch (e) { console.error(`[Stock Price] Error fetching TWSE data: ${e.message}`); }

    console.error(`[Stock Price] Failed to find a valid price for ${stockNo} in any source.`);
    return null;
}


app.post('/api/market-cap', async (req, res) => {
    const { companyCode } = req.body;
    if (!companyCode) {
        return res.status(400).json({ error: 'companyCode is required.' });
    }
    
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    try {
        // 1. Check for a fresh cache entry
        const cached = await db.get(
            'SELECT * FROM market_caps WHERE company_code = ? AND updated_at = ?',
            companyCode, today
        );

        if (cached) {
            console.log(`[Cache] HIT for Market Cap ${companyCode}`);
            return res.json({
                companyCode: cached.company_code,
                marketCap: cached.market_cap_twd,
                marketCapUSD: cached.market_cap_twd / 30, // Recalculate to be safe
                issuedShares: cached.issued_shares,
                stockPrice: cached.stock_price,
                priceDate: cached.price_date
            });
        }

        console.log(`[Cache] MISS for Market Cap ${companyCode}. Fetching from APIs...`);
        
        // 2. If no cache, fetch from APIs
        const issuedShares = await getIssuedShares(companyCode);
        if (!issuedShares || isNaN(issuedShares)) {
            throw new Error('Could not retrieve valid issued shares.');
        }

        const stockPriceData = await getStockPrice(companyCode);
        if (!stockPriceData || !stockPriceData.price || isNaN(stockPriceData.price)) {
            throw new Error('Could not retrieve valid stock price.');
        }

        const marketCapTWD = issuedShares * stockPriceData.price;

        // 3. Store the new data in the cache
        await db.run(
            `INSERT OR REPLACE INTO market_caps 
             (company_code, price_date, stock_price, issued_shares, market_cap_twd, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            companyCode,
            stockPriceData.date,
            stockPriceData.price,
            issuedShares,
            marketCapTWD,
            today
        );
        console.log(`[Cache] STORED for Market Cap ${companyCode}`);

        // 4. Return the newly fetched data
        res.json({
            companyCode,
            marketCap: marketCapTWD,
            marketCapUSD: marketCapTWD / 30,
            issuedShares,
            stockPrice: stockPriceData.price,
            priceDate: stockPriceData.date
        });

    } catch (error) {
        console.error(`❌ Market Cap API error for ${companyCode}:`, error.message);
        res.status(500).json({ error: 'Failed to fetch market cap data', message: error.message });
    }
});


app.get('/api/search-company', async (req, res) => {
    const query = req.query.q;
    if (!query || query.length < 1) {
        return res.json([]);
    }

    try {
        const db = getDb();
        const companies = await db.all(
            'SELECT code, name FROM companies WHERE code LIKE ? OR name LIKE ? LIMIT 10',
            `${query}%`, `%${query}%`
        );
        res.json(companies);
    } catch (error) {
        console.error('❌ Search API error:', error);
        res.status(500).json({ error: 'Database query failed' });
    }
});

app.post('/api/revenue', async (req, res) => {
    const { companyCode, startDate } = req.body;
    if (!companyCode || !startDate) {
        return res.status(400).json({ error: 'companyCode and startDate are required.' });
    }

    const [startYear, startMonth] = startDate.split('-').map(Number);
    const monthsToFetch = generateMonths(startYear, startMonth);
    const db = getDb();
    let companyName = '';

    try {
        const results = await Promise.all(monthsToFetch.map(async ([year, month]) => {
            // 1. Check cache first
            const cached = await db.get(
                'SELECT * FROM revenues WHERE company_code = ? AND year = ? AND month = ?',
                companyCode, year, month
            );

            if (cached) {
                console.log(`[Cache] HIT for ${companyCode} (${year}-${month})`);
                if(cached.companyName && !companyName) companyName = cached.companyName;
                return { ...cached, source: 'cache' };
            }

            // 2. If not in cache, fetch from MOPS
            console.log(`[Cache] MISS for ${companyCode} (${year}-${month}). Fetching from MOPS...`);
            const minguoYear = toMinguoYear(year);
            const payload = {
                companyId: companyCode,
                dataType: "2",
                month: month.toString(),
                year: minguoYear.toString(),
                subsidiaryCompanyId: ""
            };

            const response = await fetch('https://mops.twse.com.tw/mops/api/t05st10_ifrs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`MOPS API request failed with status ${response.status}`);
            
            const rawText = await response.text();
            if (rawText.trim().startsWith('<')) {
                 throw new Error('Request blocked by MOPS firewall (CAPTCHA).');
            }

            const apiResponse = JSON.parse(rawText);
            if (apiResponse.code !== 200) {
                console.warn(`[MOPS API] Warning for ${companyCode} (${year}-${month}): ${apiResponse.message}`);
                return null; // Skip this month if API returns an error
            }

            const parsedData = parseAPIResponse(apiResponse, year, month);

            if (parsedData) {
                 if(parsedData.companyName && !companyName) companyName = parsedData.companyName;
                // 3. Save to cache
                await db.run(
                    'INSERT INTO revenues (company_code, year, month, revenue, yoy_percent, ytd_revenue) VALUES (?, ?, ?, ?, ?, ?)',
                    companyCode, parsedData.year, parsedData.month, parsedData.revenue, parsedData.yoy_percent, parsedData.ytd_revenue
                );
                console.log(`[Cache] STORED for ${companyCode} (${year}-${month})`);
                return { ...parsedData, source: 'api' };
            }
            
            return null;
        }));

        const finalResults = results.filter(r => r !== null);
        const firstValidResult = finalResults.find(r => r.companyName);
        if (firstValidResult) {
            companyName = firstValidResult.companyName;
        } else {
            const company = await db.get('SELECT name FROM companies WHERE code = ?', companyCode);
            companyName = company ? company.name : '';
        }


        res.json({
            companyCode,
            companyName,
            data: finalResults
        });

    } catch (error) {
        console.error(`❌ Revenue API error for ${companyCode}:`, error);
        res.status(500).json({ error: 'Failed to fetch revenue data', message: error.message });
    }
});


// --- Server Initialization ---

const PORT = process.env.PORT || 3001;
(async () => {
    await initializeDatabase();
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ Server running at http://0.0.0.0:${PORT}`);
    });
})();

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down server...');
    const db = getDb();
    if (db) {
        db.close((err) => {
            if (err) {
                console.error('❌ Error closing the database', err.message);
            } else {
                console.log('✅ Database connection closed.');
            }
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});