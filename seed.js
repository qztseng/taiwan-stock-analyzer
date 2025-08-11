const fetch = require('node-fetch');
const { parse } = require('csv-parse');
const { initializeDatabase, getDb } = require('./database.js');

const DATA_SOURCE_URL = 'https://mopsfin.twse.com.tw/opendata/t187ap03_L.csv';

async function seedCompanyData() {
    try {
        console.log('🌱 Starting company data seeding process...');
        await initializeDatabase();
        const db = getDb();

        console.log('Fetching company list from data source...');
        const response = await fetch(DATA_SOURCE_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.statusText}`);
        }

        console.log('Parsing CSV data...');
        const parser = response.body.pipe(parse({
            from_line: 2 // Skip header row
        }));

        await db.run('BEGIN TRANSACTION');
        let count = 0;
        const stmt = await db.prepare('INSERT OR REPLACE INTO companies (code, name) VALUES (?, ?)');

        for await (const record of parser) {
            const companyCode = record[1];
            const companyName = record[2];
            if (companyCode && companyName) {
                await stmt.run(companyCode, companyName);
                count++;
            }
        }

        await stmt.finalize();
        await db.run('COMMIT');

        console.log(`✅ Successfully seeded ${count} companies into the database.`);

    } catch (error) {
        console.error('❌ An error occurred during the seeding process:', error);
        const db = getDb();
        if (db) {
            await db.run('ROLLBACK');
        }
        process.exit(1);
    }
}

seedCompanyData();