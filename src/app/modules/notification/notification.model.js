import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    time: {
      type: Date,
      default: Date.now,
    },
    link: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ['Default', 'Request'],
      default: 'Default',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    //   required: [true, 'User ID is required'],
    },
  },
  {
    timestamps: true,
  },
);

// Create Model
const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
