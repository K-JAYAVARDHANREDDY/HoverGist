require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs/promises');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrateData() {
  console.log('Starting migration...');

  try {
    // 1. Create the table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS animations (
        id VARCHAR(255) PRIMARY KEY,
        data JSONB NOT NULL
      );
    `);
    console.log('Table "animations" created or verified.');

    // 2. Read the local JSON files
    const dataDirectory = path.join(process.cwd(), 'data/animations');
    const filenames = await fs.readdir(dataDirectory);
    
    let successCount = 0;

    for (const filename of filenames) {
      if (!filename.endsWith('.json')) continue;
      
      const filePath = path.join(dataDirectory, filename);
      const fileContents = await fs.readFile(filePath, 'utf8');
      const animationData = JSON.parse(fileContents);
      
      const id = animationData.id;

      // 3. Upsert data into PostgreSQL
      await pool.query(`
        INSERT INTO animations (id, data)
        VALUES ($1, $2)
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data;
      `, [id, animationData]);

      successCount++;
      console.log(`Migrated: ${id}`);
    }

    console.log(`Migration complete. Successfully migrated ${successCount} animations.`);

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

migrateData();
