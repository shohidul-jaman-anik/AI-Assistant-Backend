import express from 'express';
import auth from '../../middlewares/auth/auth.js';
import { DeepseekAiController } from './deepseek.controller.js';

const router = express.Router();

router
  .route('/get-response')
  .post(
    auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.USER),
    DeepseekAiController.DeepseekAiGetResponse,
  );

export const deepseekAiRoutes = router;
