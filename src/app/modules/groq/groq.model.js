const mongoose = require('mongoose');

const llamaResponseSchema = new mongoose.Schema({
  prompt: {
    type: String,
    required: true,
  },
  model: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  total_time: {
    type: String,
    required: true,
  },
});

const Llama = mongoose.model('Llama', llamaResponseSchema);

module.exports = Llama;
