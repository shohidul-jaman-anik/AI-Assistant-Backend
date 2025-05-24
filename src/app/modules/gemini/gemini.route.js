import express from 'express';
import { GeminiAiController } from './gemini.controller.js';
import { ENUM_USER_ROLE } from '../../../shared/enum.js';
import auth from '../../middlewares/auth/auth.js';

const router = express.Router();

router
  .route('/get-response')
  .post(auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.USER),GeminiAiController.GeminiAiGetResponse);

export const geminiAiRoutes = router;
