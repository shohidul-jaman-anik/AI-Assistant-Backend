const httpStatus = require("http-status");
const { catchAsync } = require("../../../shared/catchAsync");
const Notification = require("./notification.model");
const { sendResponse } = require("../../../shared/sendResponse");
const UserModel = require("../auth/auth.model");
// Import Socket.IO and Notification model
const io = require('socket.io')();



// Socket.IO event handling
io.on('connection', socket => {
    // console.log('New client connected');

    // Event handler for sending notification
    socket.on('sendNotification', async notificationData => {
        try {
            const newNotification = new Notification(notificationData);
            await newNotification.save();
            io.emit('newNotification', newNotification); // Broadcast new notification to all connected clients
        } catch (error) {
            console.error('Error sending notification:', error);
        }
    });

    // Event handler for getting notifications
    socket.on('getNotifications', async userId => {
        try {
            const notifications = await Notification.find({ userId }).sort({ created_at: -1 }).limit(10); // Get last 10 notifications for a specific user
            socket.emit('notifications', notifications); // Send notifications to the requesting client
        } catch (error) {
            console.error('Error getting notifications:', error);
        }
    });

    // Disconnect event
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Controller for sending notification
module.exports.sendNotification = catchAsync(async (req, res) => {
    const data = req.body;
    const newNotification = new Notification(data);
    await newNotification.save();
    io.emit('newNotification', newNotification); // Emit the newNotification event to all connected clients
    sendResponse(res, {
        statusCode: httpStatus.CREATED,
        success: true,
        message: 'Send Notification Successfully',
        data: newNotification,
    });

});

// Controller for getting notifications
module.exports.getNotification = catchAsync(async (req, res) => {

    const notifications = await Notification.find().sort({ created_at: -1 }).limit(10);
    io.emit('notifications', notifications); // Emit the notifications event to all connected clients
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Get Notification Successfully',
        data: notifications,
    });

});


// Controller for sending notification
module.exports.sendNotificationById = catchAsync(async (req, res) => {
    const { userId } = req.params;
    const data = req.body;

    const user = await UserModel.findOne({ _id: userId })
    // console.log('User:', user);
    if (user) {
        const newNotification = new Notification(data);
        await newNotification.save();
        io.emit('newNotification', newNotification); // Emit the newNotification event to all connected clients
        sendResponse(res, {
            statusCode: httpStatus.OK,
            success: true,
            message: 'Send Notification By Id Successfully',
            data: newNotification,
        });
    } else {
        sendResponse(res, {
            statusCode: httpStatus.NOT_FOUND,
            success: false,
            message: 'User Not Found',
        });
    }

});


// Controller for getting notifications
module.exports.getNotificationById = catchAsync(async (req, res) => {
    const { userId } = req.params;

    const notifications = await Notification.find({ userId }).sort({ created_at: -1 }).limit(10);
    io.emit('notifications', notifications); // Emit the notifications event to all connected clients
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Get Notification By Id Successfully',
        data: notifications,
    });

});


// Controller for updating notification
module.exports.updateNotificationById = catchAsync(async (req, res) => {
    const { notificationId } = req.params;
    // console.log(notificationId, 'notificationId')
    const newData = req.body;

    const updatedNotification = await Notification.updateOne(
        { _id: notificationId },
        { $set: newData },
        { runValidators: true },);

    if (updatedNotification) {
        io.emit('updatedNotification', updatedNotification); // Emit the updatedNotification event to all connected clients
        sendResponse(res, {
            statusCode: httpStatus.OK,
            success: true,
            message: 'Notification Updated Successfully',
            data:updatedNotification
        });
    } else {
        sendResponse(res, {
            statusCode: httpStatus.NOT_FOUND,
            success: false,
            message: 'Notification Not Found',
        });
    }

});



// Controller for deleting notification
module.exports.deleteNotificationById = catchAsync(async (req, res) => {
    const { notificationId } = req.params;
    // console.log(notificationId, 'notificationId')

    const deletedNotification = await Notification.findByIdAndDelete(notificationId);

    if (deletedNotification) {
        io.emit('deletedNotification', { _id: notificationId }); // Emit the deletedNotification event to all connected clients
        sendResponse(res, {
            statusCode: httpStatus.OK,
            success: true,
            message: 'Notification Deleted Successfully',
            data: deletedNotification,
        });
    } else {
        sendResponse(res, {
            statusCode: httpStatus.NOT_FOUND,
            success: false,
            message: 'Notification Not Found',
        });
    }

});
