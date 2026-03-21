/**
 * Phase 3: Vector Dimension Migration Script
 *
 * Migrates the pgvector table from the old dimension (768, used by text-embedding-004)
 * to the new dimension (1536, used by gemini-embedding-2-preview).
 *
 * WARNING: This script TRUNCATES the existing vector table. All previously embedded
 * documents will need to be re-embedded using the reembed-documents.js script.
 *
 * Usage:
 *   node scripts/migrate-vector-dim.js
 *
 * Prerequisites:
 *   - RAG_DB_* environment variables must be set (or in the env file)
 *   - Run ONLY ONCE before re-embedding
 */

import dotenv from 'dotenv';
import path from 'path';
import pg from 'pg';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const { Pool } = pg;

const TABLE_NAME = 'document_chunks_vector';
const NEW_DIMS = 1536;

async function migrate() {
  const pool = new Pool({
    host: process.env.RAG_DB_HOST,
    port: parseInt(process.env.RAG_DB_PORT) || 5432,
    database: process.env.RAG_DB_NAME,
    user: process.env.RAG_DB_USER,
    password: process.env.RAG_DB_PASSWORD,
    ssl: false,
  });

  const client = await pool.connect();

  try {
    console.log(`[migrate] Connected to ${process.env.RAG_DB_HOST}:${process.env.RAG_DB_PORT}/${process.env.RAG_DB_NAME}`);

    // Safety check — show current row count
    const countResult = await client.query(`SELECT COUNT(*) FROM "${TABLE_NAME}"`);
    const rowCount = parseInt(countResult.rows[0].count);
    console.log(`[migrate] Current row count: ${rowCount}`);

    if (rowCount > 0) {
      console.log(`[migrate] WARNING: ${rowCount} existing vector rows will be DELETED.`);
      console.log('[migrate] These must be re-embedded after migration using reembed-documents.js');
      console.log('[migrate] Proceeding in 3 seconds... (Ctrl+C to abort)');
      await new Promise((r) => setTimeout(r, 3000));
    }

    // Step 1: Drop the existing ivfflat index (if any)
    console.log('[migrate] Dropping existing vector index...');
    await client.query(`DROP INDEX IF EXISTS idx_${TABLE_NAME}_embedding`);

    // Step 2: Truncate all rows (old embeddings are incompatible with new model)
    console.log('[migrate] Truncating table...');
    await client.query(`TRUNCATE TABLE "${TABLE_NAME}"`);

    // Step 3: ALTER the vector column to new dimension
    console.log(`[migrate] Altering embedding column to vector(${NEW_DIMS})...`);
    await client.query(
      `ALTER TABLE "${TABLE_NAME}" ALTER COLUMN "embedding" TYPE vector(${NEW_DIMS})`
    );

    // Step 4: Recreate the ivfflat index for the new dimension
    console.log('[migrate] Recreating ivfflat index...');
    await client.query(`
      CREATE INDEX idx_${TABLE_NAME}_embedding
      ON "${TABLE_NAME}" USING ivfflat ("embedding" vector_cosine_ops)
      WITH (lists = 100)
    `);

    console.log(`[migrate] ✅ Migration complete — table "${TABLE_NAME}" now uses vector(${NEW_DIMS})`);
    console.log('[migrate] Next step: run "node scripts/reembed-documents.js" to re-embed all documents');
  } catch (err) {
    console.error('[migrate] ❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
