import express from 'express';
const router = express.Router();
import { AiEndpointsController } from './aiEndpoint.controller.js';

router.route('/all-model').get(AiEndpointsController.getAiEndpointForApp);
router.route('/all-model-web').get(AiEndpointsController.getAiSocketEndpoint);
router.route('/add-model').post(AiEndpointsController.addAiEndpoint);
router.route('/update-model').patch(AiEndpointsController.updateAiSocketEndpoint);

export const aiModelEndpointRoutes = router;
