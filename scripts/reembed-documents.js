/**
 * Phase 4: Re-embed All Documents Script
 *
 * After running migrate-vector-dim.js, this script re-processes every KnowledgeFile and
 * KnowledgeBankFile that was previously processed, re-embeds the content using
 * gemini-embedding-2-preview at 1536 dims, and updates the MongoDB record with the new
 * documentId and chunkCount.
 *
 * Usage:
 *   node scripts/reembed-documents.js
 *
 * Prerequisites:
 *   - Run migrate-vector-dim.js first
 *   - All RAG_DB_* and GEMINI_API_KEY env vars must be set
 *   - GCS credentials (alti_gcp.json) must be present
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import pg from 'pg';
import { Storage } from '@google-cloud/storage';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── DB / storage clients ────────────────────────────────────────────────────
const { Pool } = pg;

const pgPool = new Pool({
  host: process.env.RAG_DB_HOST,
  port: parseInt(process.env.RAG_DB_PORT) || 5432,
  database: process.env.RAG_DB_NAME,
  user: process.env.RAG_DB_USER,
  password: process.env.RAG_DB_PASSWORD,
  ssl: false,
  max: 5,
});

const gcsStorage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: path.join(process.cwd(), 'alti_gcp.json'),
});

const embeddingsIndex = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GEMINI_API_KEY,
  model: 'gemini-embedding-2-preview',
  taskType: 'RETRIEVAL_DOCUMENT',
  dimensions: 1536,
});

// ─── Inline ragService dependency (avoids ESM circular import issues) ────────
// We import the already-built ragService directly
const { addDocumentFromBuffer, initDB } = await import(
  '../src/app/modules/knowledge/services/ragService.js'
);

// ─── Mongoose models (raw schema, enough to read/write) ──────────────────────
await mongoose.connect(process.env.DATABASE_LOCAL);
console.log('[reembed] Connected to MongoDB');

// KnowledgeFile
const KnowledgeFile = mongoose.models.KnowledgeFile ||
  mongoose.model('KnowledgeFile', new mongoose.Schema({
    fileName: String,
    originalName: String,
    fileType: String,
    gcsPath: String,
    gcsBucket: String,
    gcsUrl: String,
    ownerType: String,
    ownerId: String,
    isProcessed: Boolean,
    processingStatus: String,
    documentId: String,
    chunkCount: Number,
  }, { strict: false }));

// KnowledgeBankFile
const KnowledgeBankFile = mongoose.models.KnowledgeBankFile ||
  mongoose.model('KnowledgeBankFile', new mongoose.Schema({
    fileName: String,
    originalName: String,
    fileType: String,
    gcsPath: String,
    gcsBucket: String,
    gcsUrl: String,
    userId: mongoose.Schema.Types.ObjectId,
    isProcessed: Boolean,
    processingStatus: String,
    documentId: String,
    chunkCount: Number,
  }, { strict: false }));

// ─── Helpers ─────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function downloadFromGCS(bucket, gcsPath) {
  const file = gcsStorage.bucket(bucket).file(gcsPath);
  const [buffer] = await file.download();
  return buffer;
}

async function reembedFile(fileRecord, metadataBuilder) {
  const bucket = fileRecord.gcsBucket || 'alti_assistant_knowledge_bot_files';
  const buffer = await downloadFromGCS(bucket, fileRecord.gcsPath);
  const metadata = metadataBuilder(fileRecord);

  const result = await addDocumentFromBuffer(
    pgPool,
    embeddingsIndex,
    buffer,
    fileRecord.originalName,
    fileRecord.fileType,
    metadata
  );

  return result;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function run() {
  // Ensure schema is up to date
  await initDB(pgPool, 1536);

  let processed = 0;
  let failed = 0;

  // ── KnowledgeFile (knowledge module) ──────────────────────────────────────
  const knowledgeFiles = await KnowledgeFile.find({
    isProcessed: true,
    processingStatus: 'completed',
    gcsPath: { $exists: true, $ne: '' },
  }).lean();

  console.log(`[reembed] Found ${knowledgeFiles.length} KnowledgeFile records to re-embed`);

  for (const rec of knowledgeFiles) {
    try {
      process.stdout.write(`[reembed] KnowledgeFile ${rec._id} (${rec.originalName}) ... `);
      const result = await reembedFile(rec, (r) => ({
        ownerType: r.ownerType,
        ownerId: r.ownerId,
        fileId: r._id.toString(),
        gcsUrl: r.gcsUrl,
      }));

      await KnowledgeFile.updateOne(
        { _id: rec._id },
        { $set: { documentId: result.documentId, chunkCount: result.chunkCount } }
      );

      console.log(`✅ ${result.chunkCount} chunks`);
      processed++;
    } catch (err) {
      console.log(`❌ ${err.message}`);
      failed++;
    }

    // Rate-limit: Gemini Embedding API — 200ms between requests
    await sleep(200);
  }

  // ── KnowledgeBankFile ──────────────────────────────────────────────────────
  const bankFiles = await KnowledgeBankFile.find({
    isProcessed: true,
    processingStatus: 'completed',
    gcsPath: { $exists: true, $ne: '' },
  }).lean();

  console.log(`[reembed] Found ${bankFiles.length} KnowledgeBankFile records to re-embed`);

  for (const rec of bankFiles) {
    try {
      process.stdout.write(`[reembed] KnowledgeBankFile ${rec._id} (${rec.originalName}) ... `);
      const result = await reembedFile(rec, (r) => ({
        userId: r.userId?.toString(),
        fileId: r._id.toString(),
        gcsUrl: r.gcsUrl,
        knowledgeBank: true,
      }));

      await KnowledgeBankFile.updateOne(
        { _id: rec._id },
        { $set: { documentId: result.documentId, chunkCount: result.chunkCount } }
      );

      console.log(`✅ ${result.chunkCount} chunks`);
      processed++;
    } catch (err) {
      console.log(`❌ ${err.message}`);
      failed++;
    }

    await sleep(200);
  }

  console.log(`\n[reembed] Done — ${processed} succeeded, ${failed} failed`);

  await mongoose.disconnect();
  await pgPool.end();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('[reembed] Fatal error:', err);
  process.exit(1);
});
