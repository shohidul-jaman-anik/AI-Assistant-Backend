import express from 'express';
import { ENUM_USER_ROLE } from '../../../shared/enum.js';
import auth from '../../middlewares/auth/auth.js';
import { LlamaAiController } from './groq.controller.js';
const router = express.Router();

router
  .route('/get-response')
  .post(
    auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.USER),
    LlamaAiController.GroqAiGetResponse,
  );
router
  .route('/get-response-anonymously')
  .post(LlamaAiController.GroqAiGetResponseAnonymously);

router
  .route('/get-response-from-db')
  .get(
    auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.USER),
    LlamaAiController.LlamaAiGetResponseFromDbByUserId,
  );

router
  .route('/get-response-by-sessionid/:sessionId')
  .get(
    auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.USER),
    LlamaAiController.LlamaAiGetResponseFromDbBySessionId,
  );

router
  .route('/delete-single-response/:objectId')
  .delete(
    auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.USER),
    LlamaAiController.deleteOneAiSession,
  );

router
  .route('/delete-all-response-from-db')
  .delete(
    auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.USER),
    LlamaAiController.deleteAllAiSessions,
  );

export const llamaAiRoutes = router;
