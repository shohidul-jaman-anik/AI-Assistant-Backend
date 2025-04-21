import express from 'express';
import { WishperAiController } from './wishper.controller.js';
import audioUploader from '../../middlewares/uploder/uploadAudio.js';

const router = express.Router();

const uploader = audioUploader({
  folder: 'audio',
  acl: 'public-read',
  supportedExtensions: /\.(mp3|mpeg|wav|m4a|ogg)$/i,
  maxFileSize: 10 * 1024 * 1024,
});

router.post(
  '/get-response',
  uploader.single('file'),
  WishperAiController.WishperAiGetResponse,
);

export const wishperAiRoutes = router;
