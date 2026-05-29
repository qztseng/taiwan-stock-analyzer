const { initializeDatabase } = require('./database.js');

async function clearRevenues() {
  let db;
  try {
    db = await initializeDatabase();
    await db.run('DELETE FROM revenues');
    console.log('✅ Revenues table cleared.');
  } catch (error) {
    console.error('❌ Error clearing revenues table:', error);
  } finally {
    if (db) {
      await db.close();
    }
  }
}

clearRevenues();
