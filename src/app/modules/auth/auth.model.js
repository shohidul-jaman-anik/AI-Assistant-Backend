import crypto from 'crypto';
import emailValidator from 'email-validator';
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Please provide a unique email'],
      unique: true,
      validate: function () {
        return emailValidator.validate(this.email);
      },
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      unique: false,
    },
    isSubscribed: {
      type: Boolean,
      default: false,
    },
    // should show user collection for running subscription availblabe:
    subscription: {
      price: { type: Number }, // e.g., 150
      plan_name: { type: String }, // "personal", "business"
      duration: { type: String, enum: ['month', 'year'] }, // "month" or "year"
      expiresAt: { type: Date },
      status: { type: String, enum: ['paid', 'expired'], default: 'paid' },
    },

    freePlanUsage: {
      promptsUsed: { type: Number, default: 0 },
      imagesUsed: { type: Number, default: 0 },
      lastResetAt: { type: Date, default: Date.now }, // Track when the usage was last reset
    },
    role: {
      type: String,
      enum: {
        values: ['user', 'buyer', 'admin', 'unauthorized'],
      },
      default: 'unauthorized',
    },
    llamaAiSessions: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Chat-History' },
    ],
    notifications: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Notification', // Reference to Notification model
      },
    ],
    confirmationToken: String,
    confirmationTokenExpires: Date,
    resetPasswordOTP: String,
    resetPasswordExpires: Date,
    deleteAccountOTP: String,
    deleteAccountExpires: Date,
  },
  {
    timestamps: true,
    // collection: 'users', // 👈 force mongoose to use the correct collection name
  },
);

UserSchema.methods.generateConfirmationToken = function () {
  const token = crypto.randomBytes(32).toString('hex');

  this.confirmationToken = token;

  const date = new Date();

  date.setDate(date.getDate() + 1);
  this.confirmationTokenExpires = date;

  return token;
};

const UserModel = mongoose.model('User', UserSchema);

export default UserModel;
