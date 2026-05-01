/**
 * ONE-TIME migration: recreate the `conversationId` MongoDB index as sparse.
 *
 * Run ONCE after deploying the schema fix:
 *   node src/app/modules/stockIntelligence/migrateConversationIndex.js
 *
 * What this does:
 *  1. Drops the old non-sparse unique index on conversationId (which caused E11000).
 *  2. Creates a new unique + sparse index that ignores null values.
 *
 * Safe to run multiple times — it handles "index not found" gracefully.
 */

import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function migrate() {
  if (!MONGO_URI) {
    console.error('ERROR: MONGODB_URI environment variable is not set.');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB…');

  const db = mongoose.connection.db;
  const collection = db.collection('conversations');

  // Drop old index (if it exists)
  try {
    await collection.dropIndex('conversationId_1');
    console.log('✔ Dropped old non-sparse index: conversationId_1');
  } catch (err) {
    if (err.codeName === 'IndexNotFound') {
      console.log('ℹ Old index not found — skipping drop (already clean).');
    } else {
      throw err;
    }
  }

  // Create new sparse unique index
  await collection.createIndex(
    { conversationId: 1 },
    { unique: true, sparse: true, name: 'conversationId_1' }
  );
  console.log('✔ Created new unique + sparse index: conversationId_1');

  await mongoose.disconnect();
  console.log('Done. Migration complete.');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
