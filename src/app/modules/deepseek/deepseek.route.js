import express from 'express';
import { DeepseekAiController } from './deepseek.controller.js';

const router = express.Router();

router.route('/get-response').post(DeepseekAiController.DeepseekAiGetResponse);

export const deepseekAiRoutes = router;
