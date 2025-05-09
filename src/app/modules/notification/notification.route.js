import express from 'express';
import { NotificationController } from './notification.controller.js';
const router = express.Router();

router.route('/user/:userId').post(NotificationController.sendNotificationById);

router
  .route('/get-notification/:userId')
  .get(NotificationController.getNotificationById);

router
  .route('/update/:notificationId')
  .put(NotificationController.updateNotificationById);

router
  .route('/delete/:notificationId')
  .delete(NotificationController.deleteNotificationById);

router
  .route('/delete-all')
  .delete(NotificationController.deleteAllNotification);

router
  .route('/send-notification-all')
  .post(NotificationController.sendNotification);

router.route('/get-all').get(NotificationController.getNotification);

export const notificationRoutes = router;
