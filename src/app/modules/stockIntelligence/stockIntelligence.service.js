// src/stockIntelligence/services/stockIntelligence.service.js

import { detectIntent }     from './intentDetector.js';
import { executeTools }     from './toolExecutor.js';
import { generateResponse } from './openai.service.js';
import { saveConversation } from './conversation.repository.js';

/**
 * @param {string} prompt
 * @param {{ userId?, sessionId?, conversationId?, conversationHistory? }} options
 */
export async function processQuery(prompt, options = {}) {
  const {
    userId              = null,
    sessionId           = null,
    conversationId      = null,
    conversationHistory = [],
  } = options;

  const timer = createTimer();
  const meta  = {};

  // Stage 1: Intent Detection
  timer.mark('intentDetection');
  const detectedIntents = detectIntent(prompt);
  meta.intentDetectionMs = timer.elapsed('intentDetection');
  console.log(`[StockIntelligence] Detected intents: [${detectedIntents.map((i) => i.intent).join(', ') || 'none'}]`);

  // Stage 2: Parallel live data fetch
  timer.mark('toolExecution');
  const { contextBlocks, snapshots, errors } = await executeTools(detectedIntents);
  meta.toolExecutionMs = timer.elapsed('toolExecution');
  if (errors.length > 0) console.warn(`[StockIntelligence] Data fetch warnings:`, errors);

  // Stage 3: LLM generation
  timer.mark('llmGeneration');
  const aiResult = await generateResponse(prompt, contextBlocks, errors, conversationHistory);
  meta.llmGenerationMs = timer.elapsed('llmGeneration');

  meta.totalMs    = timer.total();
  meta.model      = aiResult.model;
  meta.tokenUsage = {
    promptTokens:  aiResult.promptTokens,
    outputTokens:  aiResult.outputTokens,
    totalTokens:   aiResult.totalTokens,
  };
  console.log(`[StockIntelligence] Pipeline complete in ${meta.totalMs}ms | tokens: ${meta.tokenUsage.totalTokens}`);

  // Stage 4: Persist to MongoDB
  let savedDoc = null;
  try {
    savedDoc = await saveConversation({
      conversationId,
      prompt,
      detectedIntents: detectedIntents.map(({ intent, provider, params }) => ({ intent, provider, params })),
      liveDataSnapshots: snapshots,
      answer:            aiResult.text,
      usedLiveData:      snapshots.length > 0,
      fetchErrors:       errors,
      meta,
      userId,
      sessionId,
    });
  } catch (dbErr) {
    console.error('[StockIntelligence] MongoDB save failed:', dbErr.message);
  }

  return {
    answer:         aiResult.text,
    usedLiveData:   snapshots.length > 0,
    intents:        detectedIntents.map((i) => i.intent),
    model:          aiResult.model,
    conversationId,
    documentId:     savedDoc?._id?.toString() ?? null,
    meta,
  };
}

function createTimer() {
  const start = Date.now();
  const marks = {};
  return {
    mark:    (l) => { marks[l] = Date.now(); },
    elapsed: (l) => marks[l] ? Date.now() - marks[l] : 0,
    total:   ()  => Date.now() - start,
  };
}