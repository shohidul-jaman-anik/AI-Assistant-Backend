import express from 'express';
import { Llama4AiController } from './Llama4.controller.js';

const router = express.Router();

router
  .route('/get-response')
  .post(Llama4AiController.Llama4AiGetResponse);

export const llama4AiRoutes = router;
