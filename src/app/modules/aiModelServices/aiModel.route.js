import express from 'express';
const router = express.Router();
import { AiEndpointsController } from './aiModel.controller.js';

router.route('/all-model').get(AiEndpointsController.getAiSocketEndpoint);

export const aiModelEndpointRoutes = router;
