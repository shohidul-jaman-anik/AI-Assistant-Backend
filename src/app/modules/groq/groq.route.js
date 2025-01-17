import express from 'express';
import { LlamaAiController } from './groq.controller.js';
const router = express.Router();

router.route('/get-response').post(LlamaAiController.GroqAiGetResponse);
// router
//   .route('/get-response-anonymously')
//   .post(LlamaAiController.GroqAiGetResponseAnonymously);

router
  .route('/get-response-from-db/:userId')
  .get(LlamaAiController.LlamaAiGetResponseFromDbByUserId);

router
  .route('/get-response-by-sessionid/:sessionId')
  .get(LlamaAiController.LlamaAiGetResponseFromDbBySessionId);

router
  .route('/delete-single-response/:objectId')
  .delete(LlamaAiController.deleteOneAiSession);

router
  .route('/delete-all-response-from-db/:userId')
  .delete(LlamaAiController.deleteAllAiSessions);

export const llamaAiRoutes = router;
