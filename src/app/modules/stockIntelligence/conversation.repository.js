// src/stockIntelligence/models/conversation.repository.js

import { Conversation } from './conversation.model.js';

/**
 * Save a completed Q&A interaction to MongoDB.
 * @param {object} payload
 * @returns {Promise<import('mongoose').Document>}
 */
export async function saveConversation(payload) {
  const doc = new Conversation({
    conversationId:    payload.conversationId    ?? null,  // client-supplied thread ID
    prompt:            payload.prompt,
    detectedIntents:   payload.detectedIntents   ?? [],
    liveDataSnapshots: payload.liveDataSnapshots ?? [],
    answer:            payload.answer,
    usedLiveData:      payload.usedLiveData       ?? false,
    fetchErrors:       payload.fetchErrors        ?? [],
    meta:              payload.meta               ?? {},
    userId:            payload.userId             ?? null,
    sessionId:         payload.sessionId          ?? null,
  });

  return doc.save();
}

/**
 * Paginated list of conversations (newest first).
 */
export async function listConversations({
  page = 1,
  limit = 20,
  userId = null,
  sessionId = null,
  conversationId = null,
  intent = null,
  ticker = null,
} = {}) {
  const filter = {};
  if (userId)         filter.userId         = userId;
  if (sessionId)      filter.sessionId      = sessionId;
  if (conversationId) filter.conversationId = conversationId;
  if (intent)         filter['detectedIntents.intent'] = intent;
  if (ticker)         filter['liveDataSnapshots.ticker'] = ticker.toUpperCase();

  const skip = (page - 1) * limit;

  const [docs, total] = await Promise.all([
    Conversation.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-liveDataSnapshots.rawData')
      .lean(),
    Conversation.countDocuments(filter),
  ]);

  return {
    data: docs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext:    page * limit < total,
      hasPrev:    page > 1,
    },
  };
}

/**
 * Get full conversation thread by conversationId (all turns, oldest first).
 */
export async function getConversationThread(conversationId, limit = 50) {
  return Conversation.findByConversationId(conversationId, limit);
}

/**
 * Get a single document by MongoDB _id (full detail including rawData).
 */
export async function getConversationById(id) {
  return Conversation.findById(id).lean();
}

/**
 * Submit user feedback on a conversation document.
 */
export async function updateFeedback(id, { rating, comment, flagged }) {
  return Conversation.findByIdAndUpdate(
    id,
    {
      $set: {
        ...(rating  !== undefined && { 'feedback.rating':  rating  }),
        ...(comment !== undefined && { 'feedback.comment': comment }),
        ...(flagged !== undefined && { 'feedback.flagged': flagged }),
      },
    },
    { new: true, runValidators: true }
  ).lean();
}

/**
 * Aggregate stats for a dashboard.
 */
export async function getConversationStats() {
  const [stats] = await Conversation.getStats();

  const intentBreakdown = await Conversation.aggregate([
    { $unwind: '$detectedIntents' },
    { $group: { _id: '$detectedIntents.intent', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const topTickers = await Conversation.aggregate([
    { $unwind: '$liveDataSnapshots' },
    { $match: { 'liveDataSnapshots.ticker': { $ne: null } } },
    { $group: { _id: '$liveDataSnapshots.ticker', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  return {
    summary: stats ?? { total: 0, withLiveData: 0, avgResponseMs: 0 },
    intentBreakdown,
    topTickers,
  };
}

/**
 * Delete a single conversation document by MongoDB _id.
 */
export async function deleteConversation(id) {
  return Conversation.findByIdAndDelete(id);
}