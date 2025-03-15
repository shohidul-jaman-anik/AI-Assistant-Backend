import express from 'express';
import { GeminiAiController } from './gemini.controller.js';

const router = express.Router();

router
  .route('/get-response')
  .post(GeminiAiController.GeminiAiGetResponse);

export const geminiAiRoutes = router;
