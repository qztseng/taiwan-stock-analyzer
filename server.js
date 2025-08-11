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
