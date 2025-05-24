import express from 'express';
import { ENUM_USER_ROLE } from '../../../shared/enum.js';
import auth from '../../middlewares/auth/auth.js';
import { LlamaAiController } from './groq.controller.js';
const router = express.Router();

router.route('/get-response').post(LlamaAiController.GroqAiGetResponse);
router
  .route('/get-response-anonymously')
  .post(LlamaAiController.GroqAiGetResponseAnonymously);

router
  .route('/get-response-from-db/:userId')
  .get(
    auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.USER),
    LlamaAiController.LlamaAiGetResponseFromDbByUserId,
  );

router
  .route('/get-response-by-sessionid/:sessionId')
  .get(LlamaAiController.LlamaAiGetResponseFromDbBySessionId);

router
  .route('/delete-single-response/:objectId')
  .delete(LlamaAiController.deleteOneAiSession);

router
  .route('/delete-all-response-from-db/:userId')
  .delete(LlamaAiController.deleteAllAiSessions);

export const llamaAiRoutes = router;
