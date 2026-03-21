/**
 * RAG Service — self-contained replacement for rag-system-pgvector package.
 *
 * Exports three functions:
 *   initDB(pool, dims)
 *   addDocumentFromBuffer(pool, embeddingsIndex, buffer, fileName, fileType, metadata)
 *   queryKnowledge(pool, embeddingsQuery, llm, query, filter, topK)
 *
 * Depends only on packages already present in the project:
 *   pg, @langchain/community, langchain, pdf-parse, mammoth, cheerio
 */

import pg from 'pg';
import mammoth from 'mammoth';
import * as cheerio from 'cheerio';
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from '@langchain/core/documents';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../../../shared/logger.js';
import { PDFParse } from 'pdf-parse';

const { Pool } = pg;

// ---------------------------------------------------------------------------
// Table names — match the existing schema created by rag-system-pgvector
// ---------------------------------------------------------------------------
const TABLE_NAME = 'document_chunks_vector';
const EMBEDDING_COLUMN = 'embedding';
const CONTENT_COLUMN = 'pageContent';
const METADATA_COLUMN = 'metadata';
const ID_COLUMN = 'id';

// ---------------------------------------------------------------------------
// initDB — ensure the vector extension and table exist
// ---------------------------------------------------------------------------
/**
 * Create pgvector extension and the document chunks table if they do not exist.
 * @param {import('pg').Pool} pool
 * @param {number} dims  Embedding dimension (1536 for gemini-embedding-2-preview)
 */
export async function initDB(pool, dims = 1536) {
  const client = await pool.connect();
  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS vector');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${TABLE_NAME}" (
        "${ID_COLUMN}"      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "${CONTENT_COLUMN}" TEXT,
        "${METADATA_COLUMN}" JSONB,
        "${EMBEDDING_COLUMN}" vector(${dims})
      )
    `);

    // Check if table has data before creating IVF index
    // IVF indexes require existing data to build the index structure
    const countResult = await client.query(`SELECT COUNT(*) FROM "${TABLE_NAME}"`);
    const rowCount = parseInt(countResult.rows[0].count, 10);

    if (rowCount > 0) {
      // Only create IVF index if table has data
      try {
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_${TABLE_NAME}_embedding
          ON "${TABLE_NAME}" USING ivfflat ("${EMBEDDING_COLUMN}" vector_cosine_ops)
          WITH (lists = 100)
        `);
        logger.info(`[RAGService] IVF index created on ${rowCount} rows`);
      } catch (indexError) {
        logger.warn(`[RAGService] IVF index creation failed (will retry after data insert): ${indexError.message}`);
      }
    } else {
      logger.info(`[RAGService] Table is empty, IVF index will be created after first document insert`);
    }

    logger.info(`[RAGService] DB initialized — table "${TABLE_NAME}", dims=${dims}`);
  } catch (error) {
    logger.error(`[RAGService] RAG DB init error: ${error.message}`, error);
    throw error;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Helper to ensure IVF index exists (called after data insert)
// ---------------------------------------------------------------------------
async function ensureIndex(pool) {
  const client = await pool.connect();
  try {
    // Check if index already exists
    const indexCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = '${TABLE_NAME}' 
        AND indexname = 'idx_${TABLE_NAME}_embedding'
      )
    `);

    const indexExists = indexCheck.rows[0].exists;

    if (!indexExists) {
      // Check if table has data
      const countResult = await client.query(`SELECT COUNT(*) FROM "${TABLE_NAME}"`);
      const rowCount = parseInt(countResult.rows[0].count, 10);

      if (rowCount > 0) {
        await client.query(`
          CREATE INDEX idx_${TABLE_NAME}_embedding
          ON "${TABLE_NAME}" USING ivfflat ("${EMBEDDING_COLUMN}" vector_cosine_ops)
          WITH (lists = 100)
        `);
        logger.info(`[RAGService] IVF index created on ${rowCount} rows`);
      }
    }
  } catch (error) {
    // Non-fatal — queries will still work without index (just slower)
    logger.warn(`[RAGService] Index creation skipped: ${error.message}`);
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Document parsing helpers
// ---------------------------------------------------------------------------
async function parseBuffer(buffer, fileType) {
  const ext = (fileType || '').toLowerCase().replace(/^\./, '');

  if (ext === 'pdf') {
    const data = new PDFParse({
      data: buffer,
    });
    const parsedData = await data.getText();
    return parsedData;
  }

  if (ext === 'docx' || ext === 'doc') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (ext === 'html' || ext === 'htm') {
    const $ = cheerio.load(buffer.toString('utf-8'));
    $('script, style').remove();
    return $('body').text() || $.root().text();
  }

  // txt, csv, md, json, xml — treat as plain text
  return buffer.toString('utf-8');
}

// ---------------------------------------------------------------------------
// Normalise a float32 vector to unit length (required for cosine at 1536 dims)
// ---------------------------------------------------------------------------
function normalise(vec) {
  const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  if (magnitude === 0) return vec;
  return vec.map((v) => v / magnitude);
}

// ---------------------------------------------------------------------------
// addDocumentFromBuffer — parse → chunk → embed (RETRIEVAL_DOCUMENT) → store
// ---------------------------------------------------------------------------
/**
 * Process a file buffer and store its chunks in the vector DB.
 *
 * @param {import('pg').Pool} pool
 * @param {import('@langchain/google-genai').GoogleGenerativeAIEmbeddings} embeddingsIndex
 *        Must be initialised with taskType: 'RETRIEVAL_DOCUMENT'
 * @param {Buffer} buffer
 * @param {string} fileName
 * @param {string} fileType  e.g. 'pdf', 'docx', 'txt'
 * @param {Object} metadata  e.g. { ownerType, ownerId, fileId, gcsUrl }
 * @returns {{ documentId: string, chunkCount: number, title: string }}
 */
export async function addDocumentFromBuffer(
  pool,
  embeddingsIndex,
  buffer,
  fileName,
  fileType,
  metadata = {}
) {
  // 1. Parse text from buffer
  const rawText = await parseBuffer(buffer, fileType);
  if (!rawText || rawText.trim().length === 0) {
    throw new Error(`[RAGService] No extractable text in file: ${fileName}`);
  }

  // 2. Chunk
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const chunks = await splitter.splitText(rawText);

  if (chunks.length === 0) {
    throw new Error(`[RAGService] Text chunking produced 0 chunks for: ${fileName}`);
  }

  // 3. Stable documentId shared across all chunks for this file
  const documentId = uuidv4();

  // 4. Build LangChain Documents
  const docs = chunks.map((chunk, idx) => {
    return new Document({
      pageContent: chunk,
      metadata: {
        ...metadata,
        documentId,
        fileName,
        fileType,
        chunkIndex: idx,
        totalChunks: chunks.length,
      },
    });
  });

  // 5. Embed (taskType RETRIEVAL_DOCUMENT is baked into embeddingsIndex) + store
  const pgConfig = {
    pool,
    tableName: TABLE_NAME,
    columns: {
      idColumnName: ID_COLUMN,
      vectorColumnName: EMBEDDING_COLUMN,
      contentColumnName: CONTENT_COLUMN,
      metadataColumnName: METADATA_COLUMN,
    },
  };

  await PGVectorStore.fromDocuments(docs, embeddingsIndex, pgConfig);

  // Ensure IVF index exists now that we have data
  await ensureIndex(pool);

  logger.info(
    `[RAGService] Stored ${chunks.length} chunks for documentId=${documentId}, file=${fileName}`
  );

  return {
    documentId,
    chunkCount: chunks.length,
    title: fileName,
  };
}

// ---------------------------------------------------------------------------
// queryKnowledge — embed (RETRIEVAL_QUERY) → similarity search → generate
// ---------------------------------------------------------------------------
/**
 * Run a RAG query against the stored vector chunks.
 *
 * @param {import('pg').Pool} pool
 * @param {import('@langchain/google-genai').GoogleGenerativeAIEmbeddings} embeddingsQuery
 *        Must be initialised with taskType: 'RETRIEVAL_QUERY'
 * @param {import('@langchain/core/language_models').BaseChatModel} llm
 * @param {string} query
 * @param {{ ownerType?: string, ownerId?: string, documentIds?: string[] }} filter
 * @param {number} topK
 * @returns {{ answer: string, sources: Array<{ documentId, content, score, metadata }> }}
 */
export async function queryKnowledge(
  pool,
  embeddingsQuery,
  llm,
  query,
  filter = {},
  topK = 5
) {
  const pgConfig = {
    pool,
    tableName: TABLE_NAME,
    columns: {
      idColumnName: ID_COLUMN,
      vectorColumnName: EMBEDDING_COLUMN,
      contentColumnName: CONTENT_COLUMN,
      metadataColumnName: METADATA_COLUMN,
    },
  };

  const store = await PGVectorStore.initialize(embeddingsQuery, pgConfig);

  // Build metadata filter for LangChain PGVectorStore
  // PGVectorStore supports { key: { eq: value } } operators
  const pgFilter = buildFilter(filter);

  const results = await store.similaritySearchWithScore(query, topK, pgFilter);

  if (results.length === 0) {
    return {
      answer: 'I could not find relevant information in the knowledge base for your query.',
      sources: [],
    };
  }

  // Compose context
  const context = results
    .map(([doc, score], idx) => `[Source ${idx + 1}] (relevance: ${score.toFixed(3)})\n${doc.pageContent}`)
    .join('\n\n---\n\n');

  const prompt = `You are a helpful assistant. Use the following context excerpts to answer the user's question accurately.
If the answer cannot be determined from the context, say so clearly — do not make up information.

Context:
${context}

Question: ${query}

Answer:`;

  const response = await llm.invoke(prompt);
  const answer = typeof response.content === 'string'
    ? response.content
    : response.content.map((c) => (c.type === 'text' ? c.text : '')).join('');

  const sources = results.map(([doc, score]) => ({
    documentId: doc.metadata?.documentId,
    content: doc.pageContent?.substring(0, 300),
    score,
    metadata: doc.metadata,
  }));

  return { answer, sources };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function buildFilter(filter) {
  if (!filter || Object.keys(filter).length === 0) return undefined;

  const conditions = {};
  if (filter.ownerType) conditions.ownerType = { eq: filter.ownerType };
  if (filter.ownerId) conditions.ownerId = { eq: filter.ownerId };
  if (filter.documentIds && filter.documentIds.length > 0) {
    // PGVectorStore doesn't support 'in' natively — handled separately if needed
    conditions.documentId = { eq: filter.documentIds[0] };
  }
  return Object.keys(conditions).length > 0 ? conditions : undefined;
}

/**
 * Create a pg Pool from a config object.
 * @param {{ host, port, database, username, password }} dbConfig
 */
export function createPool(dbConfig) {
  return new Pool({
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.username,
    password: dbConfig.password,
    ssl: false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}
