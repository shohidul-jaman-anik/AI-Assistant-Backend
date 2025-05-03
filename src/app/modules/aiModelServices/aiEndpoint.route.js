import express from 'express';
import { AiEndpointsController } from './aiEndpoint.controller.js';
const router = express.Router();

router.route('/all-model').get(AiEndpointsController.getAiEndpointForApp);
router.route('/all-model-web').get(AiEndpointsController.getWebAiEndpoint);
router.route('/add-model').post(AiEndpointsController.addAiEndpoint);
router.route('/update-model').patch(AiEndpointsController.updateWebAiEndpoint);

export const aiModelEndpointRoutes = router;
