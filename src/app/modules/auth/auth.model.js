import mongoose from 'mongoose';
import crypto from 'crypto';
import emailValidator from 'email-validator';


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
    role: {
      type: String,
      enum: {
        values: ['user', 'buyer', 'admin', 'unauthorized'],
      },
      default: 'unauthorized',
    },
    plan: { type: String, enum: ['free', 'premium'], default: 'free' },
    paymentStatus: {
      type: String,
      enum: ['active', 'inactive', 'pending'],
      default: 'inactive',
    },
    llamaAiSessions: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Chat-History' },
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