import express from 'express';
import { GeminiAiController } from './gemini.controller.js';

const router = express.Router();

router
  .route('/get-response-anonymously')
  .post(GeminiAiController.GeminiAiGetResponseAnonymously);

export const geminiAiRoutes = router;
