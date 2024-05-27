const express = require('express');
const router = express.Router();
const ollamaController = require('./ollama.controller');



router.route('/get-response').post(ollamaController.OllamaAiGetResponse)


module.exports = router;