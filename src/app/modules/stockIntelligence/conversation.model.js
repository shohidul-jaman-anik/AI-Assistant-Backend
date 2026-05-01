// src/stockIntelligence/models/conversation.model.js
import mongoose from 'mongoose';

// ── Sub-schemas ────────────────────────────────────────────────────────────

const LiveDataSnapshotSchema = new mongoose.Schema(
  {
    provider:       { type: String, required: true },
    intent:         { type: String, required: true },
    ticker:         { type: String, default: null },
    rawData:        { type: mongoose.Schema.Types.Mixed },
    contextBlock:   { type: String },
    fetchedAt:      { type: Date, default: Date.now },
    fetchDurationMs:{ type: Number },
  },
  { _id: false }
);

const TokenUsageSchema = new mongoose.Schema(
  {
    promptTokens:  { type: Number },
    outputTokens:  { type: Number },
    totalTokens:   { type: Number },
  },
  { _id: false }
);

const PipelineMetaSchema = new mongoose.Schema(
  {
    intentDetectionMs: { type: Number },
    toolExecutionMs:   { type: Number },
    llmGenerationMs:   { type: Number },
    totalMs:           { type: Number },
    model:             { type: String },
    tokenUsage:        { type: TokenUsageSchema },
  },
  { _id: false }
);

// ── Main Conversation Schema ───────────────────────────────────────────────

const ConversationSchema = new mongoose.Schema(
  {
    // Client-supplied conversation thread ID (optional, for multi-turn grouping)
    // NOT unique — multiple documents can share the same conversationId thread
    conversationId: {
      type:    String,
      default: null,
      index:   true,   // non-unique index — fast lookup per thread
    },

    prompt: {
      type:      String,
      required:  [true, 'Prompt is required'],
      trim:      true,
      maxlength: [5000, 'Prompt cannot exceed 5000 characters'],
    },

    detectedIntents: [
      {
        intent:   { type: String },
        provider: { type: String },
        params:   { type: mongoose.Schema.Types.Mixed },
      },
    ],

    liveDataSnapshots: [LiveDataSnapshotSchema],

    answer: {
      type:     String,
      required: true,
      trim:     true,
    },

    usedLiveData: { type: Boolean, default: false },

    fetchErrors: [{ type: String }],

    meta: { type: PipelineMetaSchema },

    userId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'User',
      default: null,
      index:   true,
    },
    sessionId: { type: String, default: null, index: true },

    feedback: {
      rating:  { type: Number, min: 1, max: 5, default: null },
      comment: { type: String, maxlength: 1000, default: null },
      flagged: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
    collection: 'conversations',
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────
ConversationSchema.index({ createdAt: -1 });
ConversationSchema.index({ conversationId: 1, createdAt: -1 }); // thread lookup
ConversationSchema.index({ 'detectedIntents.intent': 1 });
ConversationSchema.index({ 'liveDataSnapshots.ticker': 1 });
ConversationSchema.index({ userId: 1, createdAt: -1 });
ConversationSchema.index({ sessionId: 1, createdAt: -1 });

// ── Virtual ────────────────────────────────────────────────────────────────
ConversationSchema.virtual('promptPreview').get(function () {
  return this.prompt.length > 100 ? this.prompt.slice(0, 97) + '...' : this.prompt;
});

// ── Statics ────────────────────────────────────────────────────────────────
ConversationSchema.statics.findByTicker = function (ticker, limit = 20) {
  return this.find({ 'liveDataSnapshots.ticker': ticker.toUpperCase() })
    .sort({ createdAt: -1 }).limit(limit).lean();
};

ConversationSchema.statics.findByIntent = function (intent, limit = 20) {
  return this.find({ 'detectedIntents.intent': intent })
    .sort({ createdAt: -1 }).limit(limit).lean();
};

ConversationSchema.statics.findByConversationId = function (conversationId, limit = 50) {
  return this.find({ conversationId })
    .sort({ createdAt: 1 }).limit(limit).lean();
};

ConversationSchema.statics.getStats = function () {
  return this.aggregate([
    {
      $group: {
        _id:              null,
        total:            { $sum: 1 },
        withLiveData:     { $sum: { $cond: ['$usedLiveData', 1, 0] } },
        avgResponseMs:    { $avg: '$meta.totalMs' },
        avgPromptTokens:  { $avg: '$meta.tokenUsage.promptTokens' },
      },
    },
  ]);
};

// ── Drop the stale unique index if it exists ───────────────────────────────
// This runs once on startup. Safe to call repeatedly — it no-ops if the
// index is already gone.
export async function dropStaleIndexes(connection) {
  try {
    const col = connection.collection('conversations');
    const indexes = await col.indexes();
    const stale = indexes.find(
      (idx) => idx.name === 'conversationId_1' && idx.unique === true
    );
    if (stale) {
      await col.dropIndex('conversationId_1');
      console.log('[Conversation] Dropped stale unique index: conversationId_1');
    }
  } catch (err) {
    // Non-fatal — log and continue. The insert will still fail on old MongoDB
    // versions that don't support dropIndex on a non-existent index, but
    // the error will be caught at the save layer.
    console.warn('[Conversation] Could not drop stale index:', err.message);
  }
}

export const Conversation =
  mongoose.models?.Conversation ||
  mongoose.model('Conversation', ConversationSchema);