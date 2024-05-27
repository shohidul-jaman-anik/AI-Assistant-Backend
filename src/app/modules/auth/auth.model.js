const mongoose = require('mongoose');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
  firstName: {
    type: String,
    unique: true,
  },
  lastName: {
    type: String,
    unique: true,
  },
  username: {
    type: String,
    unique: true,
  },
  email: {
    type: String,
    required: [true, 'Please provide a unique email'],
    unique: true,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    unique: false,
  },
  role: {
    type: String,
    enum: {
      values: ['seller', 'buyer', 'admin', 'unauthorized'],
    },
    default: 'unauthorized',
  },
  mobile: { type: Number },
  profile: { type: String },
  notes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Notes',
    },
  ],
  confirmationToken: String,
  confirmationTokenExpires: Date,
});

UserSchema.methods.generateConfirmationToken = function () {
  const token = crypto.randomBytes(32).toString('hex');

  this.confirmationToken = token;

  const date = new Date();

  date.setDate(date.getDate() + 1);
  this.confirmationTokenExpires = date;

  return token;
};

const UserModel = mongoose.model('User', UserSchema);

module.exports = UserModel;
