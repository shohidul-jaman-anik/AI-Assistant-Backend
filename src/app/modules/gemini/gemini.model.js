const mongoose = require('mongoose');

const gemma2SessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User',required: true },
  sessionId: String,
  responses: [
    {
      response: String,
      prompt: String,
      done: Boolean,
      total_duration: Number,
      load_duration: Number,
      created_at: { type: Date, default: Date.now },
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

const Gemma2AiSession = mongoose.model('Gemma2', gemma2SessionSchema);

module.exports = Gemma2AiSession;