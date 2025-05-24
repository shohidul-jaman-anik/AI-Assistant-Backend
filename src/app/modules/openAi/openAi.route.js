import express from 'express';
import { ENUM_USER_ROLE } from '../../../shared/enum.js';
import auth from '../../middlewares/auth/auth.js';
import { openAIAiController } from './openAi.controller.js';

const router = express.Router();

router
  .route('/get-response')
  .post(
    auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.USER),
    openAIAiController.Gpt4oMiniGetResponse,
  );

export const openAIAiRoutes = router;
