import express from 'express';
import { composioController } from './composio.controller.js';

const router = express.Router();

router.get('/gmail/auth/start', composioController.startOAuth);
router.get('/gmail/auth/callback', composioController.handleCallback);
router.post('/gmail/send-email', composioController.sendEmail);

router.get('/linkedin/auth/start', composioController.startLinkedInOAuth);
router.get(
  '/linkedin/auth/callback',
  composioController.handleLinkedInCallback,
);
router.post('/linkedin/post', composioController.postToLinkedIn);

export const composioRoutes = router;
