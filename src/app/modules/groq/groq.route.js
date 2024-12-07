const express = require('express');
const router = express.Router();
const groqAiController = require('./groq.controller');



router.route('/get-response').post(groqAiController.GroqAiGetResponse)


module.exports = router;