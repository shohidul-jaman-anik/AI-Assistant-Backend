import express from 'express';
import { authRoutes } from '../modules/auth/auth.route.js';
import { deepseekAiRoutes } from '../modules/deepseek/deepseek.route.js';
import { geminiAiRoutes } from '../modules/gemini/gemini.route.js';
import { llamaAiRoutes } from '../modules/groq/groq.route.js';
import { subscriptionRoutes } from '../modules/payment/payment.route.js';
import { tavilyAiRoutes } from '../modules/tavily/tavily.route.js';
import { togetherAiRoutes } from '../modules/togetherAi/togeterAi.route.js';
import { serperAiRoutes } from '../modules/serper/serper.route.js';
import { qwenAiRoutes } from '../modules/qwen/qwen.route.js';
import { aiModelEndpointRoutes } from '../modules/aiModelServices/aiEndpoint.route.js';
import { openAIAiRoutes } from '../modules/openAi/openAi.route.js';
import { wishperAiRoutes } from '../modules/wishper/wishper.route.js';
import { adminRoutes } from '../modules/admin/admin.route.js';
import { llama4AiRoutes } from '../modules/Llama4/Llama4.route.js';

const router = express.Router();

const moduleRoutes = [
  {
    path: '/admin',
    route: adminRoutes,
  },
  {
    path: '/auth',
    route: authRoutes,
  },
  {
    path: '/subscription',
    route: subscriptionRoutes,
  },
  {
    path: '/groq',
    route: llamaAiRoutes,
  },
  {
    path: '/img-generation',
    route: togetherAiRoutes,
  },
  {
    path: '/tavily',
    route: tavilyAiRoutes,
  },
  {
    path: '/gemini',
    route: geminiAiRoutes,
  },
  {
    path: '/llama4',
    route: llama4AiRoutes,
  },
  {
    path: '/deepseek',
    route: deepseekAiRoutes,
  },
  {
    path: '/serper',
    route: serperAiRoutes,
  },
  {
    path: '/qwen',
    route: qwenAiRoutes,
  },
  {
    path: '/wishper',
    route: wishperAiRoutes,
  },
  {
    path: '/openai',
    route: openAIAiRoutes,
  },
  {
    path: '/api-endpoint',
    route: aiModelEndpointRoutes,
  },
];

moduleRoutes.forEach(route => router.use(route.path, route.route));

export default router;
