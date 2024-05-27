const express = require('express');
const router = express.Router();
const notificationController = require('./notification.controller')

router
    .route('/user/:userId')
    .get(notificationController.getNotificationById)
    .post(notificationController.sendNotificationById)


router
    .route('/:notificationId')
    .put(notificationController.updateNotificationById)
    .delete(notificationController.deleteNotificationById)


router
    .route('/')
    .get(notificationController.getNotification)
    .post(notificationController.sendNotification)

module.exports = router;