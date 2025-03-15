import express from 'express';
import { QwenAiController } from './qwen.controller.js';

const router = express.Router();

router.route('/coder/get-response').post(QwenAiController.QwenAiGetResponse);
router.route('/qwq/get-response').post(QwenAiController.QwenQWQAiGetResponse);

export const qwenAiRoutes = router;
