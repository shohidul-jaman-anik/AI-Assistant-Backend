import express from 'express';
import { openAIAiController } from './openAi.controller.js';

const router = express.Router();

router
  .route('/get-response')
  .post(openAIAiController.Gpt4oMiniGetResponse);

export const openAIAiRoutes = router;
