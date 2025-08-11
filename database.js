const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

let db;

async function initializeDatabase() {
    if (db) {
        return db;
    }

    try {
        db = await open({
            filename: './database.db',
            driver: sqlite3.Database
        });

        console.log('✅ Database connection established.');

        await db.exec(`
            CREATE TABLE IF NOT EXISTS companies (
                code TEXT PRIMARY KEY,
                name TEXT NOT NULL
            );
        `);

        await db.exec(`
            CREATE TABLE IF NOT EXISTS revenues (
                company_code TEXT NOT NULL,
                year INTEGER NOT NULL,
                month INTEGER NOT NULL,
                revenue REAL,
                yoy_percent REAL,
                ytd_revenue REAL,
                PRIMARY KEY (company_code, year, month),
                FOREIGN KEY (company_code) REFERENCES companies(code)
            );
        `);

        await db.exec(`
            CREATE TABLE IF NOT EXISTS market_caps (
                company_code TEXT PRIMARY KEY,
                price_date TEXT NOT NULL,
                stock_price REAL NOT NULL,
                issued_shares INTEGER NOT NULL,
                market_cap_twd REAL NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (company_code) REFERENCES companies(code)
            );
        `);

        console.log('✅ Tables initialized successfully.');
        return db;
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
    }
}

function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call initializeDatabase() first.');
    }
    return db;
}

module.exports = { initializeDatabase, getDb };
