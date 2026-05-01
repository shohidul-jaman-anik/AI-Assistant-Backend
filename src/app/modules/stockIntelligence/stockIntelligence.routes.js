// src/stockIntelligence/routes/stockIntelligence.routes.js
import { Router } from 'express';
import {
  chat,
  debugIntent,
  getConversation,
  getConversations,
  getThread,
  getPlugins,
  getStats,
  removeConversation,
  submitFeedback,
} from './stockIntelligence.controller.js';

const router = Router();

// ── Core ───────────────────────────────────────────────────────────────────
router.post('/chat', chat);

// ── Conversation history ───────────────────────────────────────────────────
router.get('/conversations',                          getConversations);
router.get('/conversations/thread/:conversationId',   getThread);        // all turns in a thread
router.get('/conversations/:id',                      getConversation);  // single document by _id
router.delete('/conversations/:id',                   removeConversation);
router.patch('/conversations/:id/feedback',           submitFeedback);

// ── Admin / Debug ──────────────────────────────────────────────────────────
router.post('/debug/intent', debugIntent);
router.get('/plugins',       getPlugins);
router.get('/stats',         getStats);

export const stockIntelligenceRoutes = router;