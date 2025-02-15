import express from 'express';
import { llamaAiRoutes } from '../modules/groq/groq.route.js';
import { authRoutes } from '../modules/auth/auth.route.js';
import { tavilyAiRoutes } from '../modules/tavily/tavily.route.js';
import { togetherAiRoutes } from '../modules/togetherAi/togeterAi.route.js';

const router = express.Router();



const moduleRoutes = [
  {
    path: '/auth',
    route: authRoutes,
  },
  // {
  //   path: '/admin/activity',
  //   route: adminRoute,
  // },
  // {
  //   path: '/forum',
  //   route: forumRoute,
  // },
  // {
  //   path: '/payment',
  //   route: paymentRoute,
  // },
  // {
  //   path: '/notification',
  //   route: notificationRoute,
  // },
  // {
  //   path: '/note',
  //   route: taskRoute,
  // },
  // {
  //   path: '/streaming',
  //   route: streamingRoute,
  // },
  // {
  //   path: '/ollama',
  //   route: ollamaAiRoute,
  // },
  // {
  //   path: '/chatgpt',
  //   route: chatGptRoute,
  // },
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
];

moduleRoutes.forEach(route => router.use(route.path, route.route));

export default router; 
