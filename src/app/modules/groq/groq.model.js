const mongoose = require('mongoose');

const llamaResponseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sessionId: String,
  responses: [
    {
      prompt: {
        type: String,
        required: true,
      },
      model: {
        type: String,
        required: true,
      },
      reply: {
        type: String,
        required: true,
      },
      total_time: {
        type: String,
        required: true,
      },
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

const Llama = mongoose.model('Llama', llamaResponseSchema);

module.exports = Llama;
