const fetch = require('node-fetch');
const { parse } = require('csv-parse');
const { initializeDatabase, getDb } = require('./database.js');

const DATA_SOURCES = {
    TSE: 'https://mopsfin.twse.com.tw/opendata/t187ap03_L.csv', // Listed companies
    TPEx: 'https://mopsfin.twse.com.tw/opendata/t187ap03_O.csv', // OTC companies
    ESB: 'https://mopsfin.twse.com.tw/opendata/t187ap03_R.csv'   // Emerging companies
};

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

        await db.run('COMMIT');
        console.log(`🎉🎉🎉 Seeding complete! Total companies seeded: ${totalCount}.`);

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
