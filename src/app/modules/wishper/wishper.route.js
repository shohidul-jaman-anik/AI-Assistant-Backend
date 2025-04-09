import express from 'express';
import { WishperAiController } from './wishper.controller.js';

const router = express.Router();

router
  .route('/get-response')
  .post(WishperAiController.WishperAiGetResponse);

export const wishperAiRoutes = router;
