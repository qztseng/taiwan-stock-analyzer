const fetch = require('node-fetch');
const { parse } = require('csv-parse');
const { initializeDatabase, getDb } = require('./database.js');

const DATA_SOURCES = {
    TSE: 'https://mopsfin.twse.com.tw/opendata/t187ap03_L.csv', // Listed companies
    TPEx: 'https://mopsfin.twse.com.tw/opendata/t187ap03_O.csv', // OTC companies
    ESB: 'https://mopsfin.twse.com.tw/opendata/t187ap03_R.csv'   // Emerging companies
};

// --- Utility Functions (copied from server.js for seeding) ---

function toMinguoYear(year) {
    return year - 1911;
}

function generateMonths(startYear, startMonth) {
    const current = new Date();
    let year = startYear;
    let month = startMonth;
    const months = [];
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
    const findValue = (key) => {
        const item = data.find(d => d[0] === key);
        const value = item ? item[1] : null;
        return value ? value.replace(/,/g, '') : null;
    };

    const revenueStr = findValue('本月');
    if (revenueStr === null) {
        return null; // Not an error, just no data for this month (e.g., future month)
    }
    const lastYearRevenueStr = findValue('去年同期');
    const ytdRevenueStr = findValue('本年累計');

    const revenue = parseFloat(revenueStr);
    const lastYearRevenue = parseFloat(lastYearRevenueStr);
    const ytdRevenue = parseFloat(ytdRevenueStr);

    const revenueInMillions = revenue / 1000;
    const ytdRevenueInMillions = ytdRevenue / 1000;
    const yoyPercent = lastYearRevenue > 0 ? ((revenue - lastYearRevenue) / lastYearRevenue) * 100 : null;

    return {
        year: year,
        month: month,
        revenue: revenueInMillions,
        yoy_percent: yoyPercent,
        ytd_revenue: ytdRevenueInMillions
    };
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


// --- Seeding Functions ---

async function fetchAndSeedFromSource(db, url, marketName) {
    console.log(`Fetching company list for ${marketName} from ${url}...`);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch data for ${marketName}: ${response.statusText}`);
    }

    const parser = response.body.pipe(parse({ from_line: 2 }));
    const stmt = await db.prepare('INSERT OR REPLACE INTO companies (code, name) VALUES (?, ?)');
    let count = 0;

    for await (const record of parser) {
        const companyCode = record[1];
        const companyName = record[2];
        if (companyCode && companyName) {
            await stmt.run(companyCode, companyName);
            count++;
        }
    }
    await stmt.finalize();
    console.log(`✅ Successfully seeded ${count} companies from ${marketName}.`);
    return count;
}

async function seedDefaultRevenueData(db) {
    console.log('🌱 Seeding revenue data for default companies...');
    const DEFAULT_COMPANIES = ['6841', '6857'];
    const startYear = 2022;
    const monthsToFetch = generateMonths(startYear, 1);
    
    const stmt = await db.prepare('INSERT OR REPLACE INTO revenues (company_code, year, month, revenue, yoy_percent, ytd_revenue) VALUES (?, ?, ?, ?, ?, ?)');

    for (const companyCode of DEFAULT_COMPANIES) {
        console.log(`   Fetching revenue for ${companyCode}...`);
        for (const [year, month] of monthsToFetch) {
            const minguoYear = toMinguoYear(year);
            const payload = {
                companyId: companyCode,
                dataType: "2",
                month: month.toString(),
                year: minguoYear.toString(),
                subsidiaryCompanyId: ""
            };

            try {
                const response = await fetch('https://mops.twse.com.tw/mops/api/t05st10_ifrs', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    console.warn(`   [API Error] Failed to fetch ${companyCode} for ${year}-${month}. Status: ${response.status}`);
                    continue;
                }
                
                const rawText = await response.text();
                if (rawText.trim().startsWith('<')) {
                     console.warn(`   [API Blocked] Request for ${companyCode} (${year}-${month}) was blocked by MOPS firewall.`);
                     continue;
                }

                const apiResponse = JSON.parse(rawText);
                if (apiResponse.code !== 200) {
                    // This is often not a true error, but just means no data for that month.
                    // console.log(`   [API Info] No data for ${companyCode} (${year}-${month}): ${apiResponse.message}`);
                    continue;
                }

                const parsedData = parseAPIResponse(apiResponse, year, month);
                if (parsedData) {
                    await stmt.run(companyCode, parsedData.year, parsedData.month, parsedData.revenue, parsedData.yoy_percent, parsedData.ytd_revenue);
                    process.stdout.write("."); // Progress indicator
                }

            } catch (error) {
                console.error(`\n   [Fetch Error] An error occurred while fetching data for ${companyCode} (${year}-${month}):`, error);
            }
            
            await sleep(500); // Add a delay to avoid rate-limiting
        }
        console.log(`\n   ✅ Finished fetching for ${companyCode}.`);
    }
    await stmt.finalize();
    console.log('🎉 Default revenue data seeding complete.');
}


async function seedAllCompanyData() {
    let totalCount = 0;
    try {
        console.log('🌱 Starting comprehensive company data seeding process...');
        await initializeDatabase();
        const db = getDb();

        await db.run('BEGIN TRANSACTION');

        for (const [marketName, url] of Object.entries(DATA_SOURCES)) {
            const count = await fetchAndSeedFromSource(db, url, marketName);
            totalCount += count;
        }
        
        console.log(`\n🎉 Company list seeding complete! Total companies seeded: ${totalCount}.`);
        
        // Seed default revenue data after company list is ready
        await seedDefaultRevenueData(db);

        await db.run('COMMIT');
        console.log(`🎉🎉🎉 Full seeding process complete!`);

    } catch (error) {
        console.error('❌ An error occurred during the seeding process:', error);
        const db = getDb();
        if (db) {
            await db.run('ROLLBACK');
        }
        process.exit(1);
    }
}

seedAllCompanyData();