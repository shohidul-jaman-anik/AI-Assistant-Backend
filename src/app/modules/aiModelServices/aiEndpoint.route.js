import express from 'express';
import { ENUM_USER_ROLE } from '../../../shared/enum.js';
import auth from '../../middlewares/auth/auth.js';
import { AiEndpointsController } from './aiEndpoint.controller.js';
const router = express.Router();

router
  .route('/all-model')
  .get(auth(ENUM_USER_ROLE.ADMIN), AiEndpointsController.getAiEndpointForApp);
router
  .route('/all-model-web')
  .get(auth(ENUM_USER_ROLE.ADMIN), AiEndpointsController.getWebAiEndpoint);
router
  .route('/add-model')
  .post(auth(ENUM_USER_ROLE.ADMIN), AiEndpointsController.addAiEndpoint);
router
  .route('/update-model')
  .patch(auth(ENUM_USER_ROLE.ADMIN), AiEndpointsController.updateWebAiEndpoint);

export const aiModelEndpointRoutes = router;
