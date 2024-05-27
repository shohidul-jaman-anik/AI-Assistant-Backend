const express = require('express');
const router = express.Router();
const chatGptController = require('./ollama.controller');



router.route('/get-response').post(chatGptController.ChatGptGetResponse)


module.exports = router;