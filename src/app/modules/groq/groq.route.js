const express = require('express');
const router = express.Router();
const groqAiController = require('./groq.controller');

router.route('/get-response').post(groqAiController.GroqAiGetResponse);

router
  .route('/get-response-from-db/:userId')
  .get(groqAiController.LlamaAiGetResponseFromDbByUserId);

router
  .route('/get-response-by-sessionid/:sessionId')
  .get(groqAiController.LlamaAiGetResponseFromDbBySessionId);

router
  .route('/delete-single-response/:objectId')
  .delete(groqAiController.deleteOneAiSession);

router
  .route('/delete-all-response-from-db/:userId')
  .delete(groqAiController.deleteAllAiResponses);

module.exports = router;
