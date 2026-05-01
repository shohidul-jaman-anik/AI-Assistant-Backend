// src/stockIntelligence/controllers/stockIntelligence.controller.js

import { processQuery }        from './stockIntelligence.service.js';
import { detectIntent }        from './intentDetector.js';
import { pluginRegistry }      from './pluginRegistry.js';
import {
  listConversations,
  getConversationById,
  getConversationThread,
  updateFeedback,
  getConversationStats,
  deleteConversation,
} from './conversation.repository.js';

// ── Main Chat ──────────────────────────────────────────────────────────────

/**
 * POST /api/stock-intelligence/chat
 *
 * Body:
 *   prompt             {string}   required
 *   conversationId     {string}   optional — groups turns into a thread
 *   sessionId          {string}   optional
 *   conversationHistory {array}   optional — prior turns for multi-turn context
 */
export async function chat(req, res, next) {
  try {
    const { prompt, conversationId, sessionId, conversationHistory } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        error: 'prompt is required and must be a non-empty string',
      });
    }

    if (prompt.trim().length > 5000) {
      return res.status(400).json({
        success: false,
        error: 'prompt exceeds maximum length of 5000 characters',
      });
    }

    const result = await processQuery(prompt.trim(), {
      userId:             req.user?.id             ?? null,
      sessionId:          sessionId                ?? null,
      conversationId:     conversationId           ?? null,   // ← forwarded to DB
      conversationHistory: Array.isArray(conversationHistory) ? conversationHistory : [],
    });

    return res.status(200).json({
      success: true,
      data: {
        answer:         result.answer,
        conversationId: result.conversationId,   // echoes back the thread ID
        documentId:     result.documentId,        // the MongoDB _id of this turn
        usedLiveData:   result.usedLiveData,
        intents:        result.intents,
        model:          result.model,
      },
      ...(process.env.NODE_ENV !== 'production' && { meta: result.meta }),
    });
  } catch (err) {
    next(err);
  }
}

// ── Conversation History ───────────────────────────────────────────────────

/**
 * GET /api/stock-intelligence/conversations
 */
export async function getConversations(req, res, next) {
  try {
    const { page = 1, limit = 20, intent, ticker, sessionId, conversationId } = req.query;

    const result = await listConversations({
      page:           parseInt(page),
      limit:          Math.min(parseInt(limit), 100),
      userId:         req.user?.id   ?? null,
      sessionId:      sessionId      ?? null,
      conversationId: conversationId ?? null,
      intent:         intent         ?? null,
      ticker:         ticker         ?? null,
    });

    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/stock-intelligence/conversations/thread/:conversationId
 * Returns all turns in a conversation thread, oldest first.
 */
export async function getThread(req, res, next) {
  try {
    const { conversationId } = req.params;
    if (!conversationId) {
      return res.status(400).json({ success: false, error: 'conversationId is required' });
    }
    const docs = await getConversationThread(conversationId);
    return res.status(200).json({ success: true, data: docs, count: docs.length });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/stock-intelligence/conversations/:id
 * Single document by MongoDB _id.
 */
export async function getConversation(req, res, next) {
  try {
    const doc = await getConversationById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Conversation not found' });
    return res.status(200).json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/stock-intelligence/conversations/:id
 */
export async function removeConversation(req, res, next) {
  try {
    const deleted = await deleteConversation(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Conversation not found' });
    return res.status(200).json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// ── Feedback ───────────────────────────────────────────────────────────────

/**
 * PATCH /api/stock-intelligence/conversations/:id/feedback
 */
export async function submitFeedback(req, res, next) {
  try {
    const { rating, comment, flagged } = req.body;

    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
    }

    const updated = await updateFeedback(req.params.id, { rating, comment, flagged });
    if (!updated) return res.status(404).json({ success: false, error: 'Conversation not found' });

    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

// ── Admin / Debug ──────────────────────────────────────────────────────────

export async function debugIntent(req, res, next) {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt required' });
    const intents = detectIntent(prompt);
    return res.status(200).json({ success: true, data: { prompt, intents } });
  } catch (err) {
    next(err);
  }
}

export async function getPlugins(req, res, next) {
  try {
    const plugins = pluginRegistry.list();
    const health  = await pluginRegistry.healthCheck();
    return res.status(200).json({
      success: true,
      data: plugins.map((p) => ({ ...p, status: health[p.name] ?? 'unknown' })),
    });
  } catch (err) {
    next(err);
  }
}

export async function getStats(req, res, next) {
  try {
    const stats = await getConversationStats();
    return res.status(200).json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
}