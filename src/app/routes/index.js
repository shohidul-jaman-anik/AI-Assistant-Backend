const express = require('express');
const router = express.Router();



const authRoute = require('../../app/modules/auth/auth.route');
const adminRoute = require('../../app/modules/admin/admin.route');
const forumRoute = require('../../app/modules/forum/forum.route');
const paymentRoute = require('../../app/modules/payment/payment.route');
const taskRoute = require('../../app/modules/notes/notes.route');
const chatRoute = require('../../app/modules/chat/chat.route');
const messageRoute = require('../../app/modules/message/message.route');
const notificationRoute = require('../../app/modules/notification/notification.route');
const streamingRoute = require('../../app/modules/streaming/streaming.route');
const ollamaAiRoute = require('../../app/modules/ollamaAi/ollama.route');
const chatGptRoute = require('../../app/modules/chatgptAi/chatgpt.route');
const groqAiRoute = require('../../app/modules/groq/groq.route');


const moduleRoutes = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/admin/activity',
    route: adminRoute,
  },
  {
    path: '/forum',
    route: forumRoute,
  },
  {
    path: '/payment',
    route: paymentRoute,
  },
  {
    path: '/notification',
    route: notificationRoute,
  },
  {
    path: '/note',
    route: taskRoute,
  },
  {
    path: '/chat',
    route: chatRoute,
  },
  {
    path: '/message',
    route: messageRoute,
  },
  {
    path: '/streaming',
    route: streamingRoute,
  },
  {
    path: '/ollama',
    route: ollamaAiRoute,
  },
  {
    path: '/chatgpt',
    route: chatGptRoute,
  },
  {
    path: '/groq',
    route: groqAiRoute,
  },
];

moduleRoutes.forEach(route => router.use(route.path, route.route));

module.exports = router;
