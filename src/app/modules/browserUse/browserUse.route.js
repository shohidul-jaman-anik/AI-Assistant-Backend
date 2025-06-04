import express from 'express';
import { BrowserUseController } from './browserUse.controller.js';
import { ENUM_USER_ROLE } from '../../../shared/enum.js';
import auth from '../../middlewares/auth/auth.js';

const router = express.Router();

router.post(
  '/task',
  auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.USER),
  BrowserUseController.browserUseRunTask,
);

router.get(
  '/get-task/:taskId',
  // auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.USER),
  BrowserUseController.getBrowserUseTaskByID,
);

export const browserUseAiRoutes = router;
