const mongoose = require('mongoose');
const crypto = require('crypto');
const emailValidator = require('email-validator');
const UserSchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,
    username: {
      type: String,
      require: [true, 'Please provide a username'],
      unique: true,
    },
    description: String,
    phone: String,
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
    profile: { type: String },
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
    plan: { type: String, enum: ['free', 'premium'], default: 'free' },
    customerId: { type: String, unique: true },
    paymentStatus: {
      type: String,
      enum: ['active', 'inactive', 'pending'],
      default: 'inactive',
    },

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

UserSchema.methods.getAllFriendRequests = async function () {
  const populatedFriendRequests = await UserModel.findById(this._id)
    .populate({
      path: 'friendRequests.sender',
      select: 'firstName lastName username email profile', // Select the fields you want to include
    })
    .select('friendRequests'); // Only select the friendRequests field

  return populatedFriendRequests.friendRequests;
};

// Methods to handle friend requests
UserSchema.methods.sendFriendRequest = async function (receiverId) {
  // Check if they are already friends
  if (this.friends.includes(receiverId)) {
    throw new Error('You are already friends with this user.');
  }

  // Check if a friend request has already been sent
  const existingRequest = await UserModel.findOne({
    _id: receiverId,
    'friendRequests.sender': this._id,
  });

  if (existingRequest) {
    throw new Error('Friend request already sent.');
  }
  const request = {
    sender: this._id,
    status: 'pending',
  };
  await UserModel.findByIdAndUpdate(receiverId, {
    $push: { friendRequests: request },
  });

  return { status: 'Success', message: 'Friend request sent successfully' };
};

UserSchema.methods.acceptFriendRequest = async function (senderId) {
  await UserModel.findByIdAndUpdate(senderId, {
    $push: { friends: this._id },
  });
  this.friends.push(senderId);
  this.friendRequests = this.friendRequests.filter(
    req => req.sender.toString() !== senderId.toString(),
  );
  await this.save();
};

UserSchema.methods.rejectFriendRequest = async function (senderId) {
  this.friendRequests = this.friendRequests.filter(
    req => req.sender.toString() !== senderId.toString(),
  );
  await this.save();
};

// Before saving database
UserSchema.pre('save', function () {
  console.log('Before saving database');
});

// After saving database
UserSchema.post('', function (doc) {
  console.log(doc, 'After saving database');
});

const UserModel = mongoose.model('User', UserSchema);

module.exports = UserModel;
