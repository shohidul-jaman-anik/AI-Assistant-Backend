import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import formData from 'form-data';
import httpStatus from 'http-status';
import Mailgun from 'mailgun.js';
import mongoose from 'mongoose';
import config from '../../../../config/index.js';
import ApiError from '../../../errors/ApiError.js';
import catchAsync from '../../../shared/catchAsync.js';
import sendResponse from '../../../shared/sendResponse.js';
import pick from '../../middlewares/other/pick.js';
import { sendMailWithMailGun } from '../../middlewares/sendEmail/sendMailWithMailGun.js';
import UserModel from './auth.model.js';
import { authService } from './auth.service.js';
import {
  deleteUserOtpTemplate,
  forgetPassOtpTemplate,
  generateOTP,
} from './auth.utils.js';
import { logger } from '../../../shared/logger.js';

const mailgun = new Mailgun(formData);

const ProtectCommonRoute = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  // logger.info(authHeader, 'authHeaderrrrrrrr');
  if (!authHeader) {
    return res.status(401).send({ message: 'UnAuthorized access' });
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, config.jwt_secret, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden access' });
    }
    // Check the user's role in the decoded JWT payload
    const userRole = decoded.role;

    if (userRole === 'user' || userRole === 'admin') {
      req.decoded = decoded;
      next(); // User with 'buyer' role is allowed
    } else {
      return res.status(403).send({ message: 'Forbidden access' });
    }
  });
};

const verifyAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'Unauthorized access' });
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, config.jwt_secret, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden access' });
    }

    // Check the user's role in the decoded JWT payload
    const userRole = decoded.role;

    if (userRole === 'admin') {
      req.decoded = decoded;
      next(); // User with 'admin' role is allowed
    } else {
      return res.status(403).send({ message: 'Forbidden access' });
    }
  });
};

const register = catchAsync(async (req, res) => {
  const result = await authService.registerService(req);
  logger.info(result, 'resultttttttttttttttt');
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const confirmEmail = catchAsync(async (req, res) => {
  const { token } = req.params;
  const result = await authService.confirmEmailService(token);
  if (result instanceof ApiError) {
    // If an ApiError is returned, handle it as an error response
    return sendResponse(res, {
      statusCode: result.statusCode,
      success: false,
      message: result.message,
    });
  }

  // If no error, redirect to the URL
  res.status(302).redirect('https://www.asonai.com');
});

const login = catchAsync(async (req, res) => {
  // logger.info(req.body, 'data login');
  const { email, password } = req.body;
  const result = await authService.loginService(email, password);
  logger.info(result, 'resultttttttttttttttt');
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Login Successfully',
    data: result,
  });
});

const forgetPassword = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { email } = req.body;
    const user = await UserModel.findOne({ email: email }).session(session);

    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).send({ error: 'You entered the wrong email' });
    }

    const OTP = await generateOTP();
    const OTPExpiration = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes

    user.resetPasswordOTP = OTP;
    user.resetPasswordExpires = OTPExpiration;
    await user.save({ session });

    const mailData = await forgetPassOtpTemplate(email, user, OTP);
    await sendMailWithMailGun(mailData);

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: 'Success',
      message: 'OTP sent successfully!',
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).send({ error: 'Something went wrong!' });
  }
};

const resetPassword = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { email, otp, newPassword } = req.body;
    const user = await UserModel.findOne({ email: email }).session(session);

    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).send({ error: 'You entered the wrong email' });
    }

    if (user.resetPasswordOTP !== otp || !user.resetPasswordOTP) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).send({ error: 'Invalid OTP' });
    }

    if (Date.now() > user.resetPasswordExpires) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).send({ error: 'OTP expired' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.resetPasswordOTP = undefined;
    user.resetPasswordExpires = undefined;
    await user.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).send({ message: 'Password updated successfully' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).send({ error: 'An error occurred' });
  }
};

const getUserByEmail = async (req, res, next) => {
  try {
    const userEmail = req.params?.userEmail;
    logger.info(userEmail, 'userId');

    if (!userEmail) {
      return res.status(501).send({ error: 'Require Id' });
    }

    const user = await UserModel.findOne({ email: userEmail });

    if (!user) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ error: "Couldn't Find the User" });
    }

    // Remove password, notes, and llamaAiSessions from user
    const { llamaAiSessions, notes, password, ...rest } = Object.assign(
      {},
      user.toJSON(),
    );

    return res.status(201).send(rest);
  } catch (error) {
    console.error(error); // Log the error for debugging purposes
    return res.status(404).send({ error: 'Cannot Find User Data' });
  }
};

const getUser = async (req, res, next) => {
  try {
    const userId = req.params?.userId;
    logger.info(userId, 'userId');

    if (!userId) {
      return res.status(501).send({ error: 'Require Id' });
    }

    const user = await UserModel.findOne({ _id: userId });

    if (!user) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ error: "Couldn't Find the User" });
    }

    // Remove password from user
    const { llamaAiSessions, notes, password, ...rest } = Object.assign(
      {},
      user.toJSON(),
    );

    return res.status(201).send(rest);
  } catch (error) {
    console.error(error); // Log the error for debugging purposes
    return res.status(404).send({ error: 'Cannot Find User Data' });
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const paginationOptions = pick(req.query, [
      'page',
      'limit',
      'sortBy',
      'sortOrder',
    ]);

    const filters = pick(req.query, ['searchTerm']);

    const users = await authService.getAllUsersService(
      filters,
      paginationOptions,
    );
    res.status(200).json({
      status: 'Success',
      message: 'Users find Successfully',
      meta: users.meta,
      data: users.data,
    });
  } catch (error) {
    res.status(400).json({
      status: 'Fail',
      message: "Users couldn't found Successfully",
      error: error.message,
    });
  }
};

const deleteUserAccountOTP = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.params?.id;

    if (!userId) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ error: 'Invalid user ID' });
    }

    const user = await UserModel.findById(userId).session(session);

    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(httpStatus.NOT_FOUND).send({ error: 'User not found' });
    }

    const OTP = await generateOTP();
    const OTPExpiration = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes

    user.deleteAccountOTP = OTP;
    user.deleteAccountExpires = OTPExpiration;
    await user.save({ session });

    const mailData = await deleteUserOtpTemplate(user, OTP);

    await sendMailWithMailGun(mailData);

    await session.commitTransaction();
    session.endSession();

    res.status(httpStatus.OK).json({
      status: 'Success',
      message: 'Delete account OTP sent successfully',
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      status: 'Fail',
      message: "Couldn't send delete account OTP",
      error: error.message,
    });
  }
};

const deleteUserAccount = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.params?.id;
    const { otp } = req.body;

    if (!userId) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ error: 'Invalid user ID' });
    }

    const user = await UserModel.findById(userId).session(session);

    if (!userId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(httpStatus.NOT_FOUND).send({ error: 'User not found' });
    }

    if (user.deleteAccountOTP !== otp || !user.deleteAccountOTP) {
      await session.abortTransaction();
      session.endSession();
      return res.status(httpStatus.BAD_REQUEST).send({ error: 'Invalid OTP' });
    }

    if (Date.now() > user.deleteAccountExpires) {
      await session.abortTransaction();
      session.endSession();
      return res.status(httpStatus.BAD_REQUEST).send({ error: 'OTP expired' });
    }

    // Proceed with deleting the user account
    const result = await UserModel.deleteOne({ _id: userId }).session(session);

    await session.commitTransaction();
    session.endSession();

    res.status(httpStatus.OK).json({
      status: 'Success',
      message: 'Account deleted successfully',
      data: result,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      status: 'Fail',
      message: "Couldn't delete account",
      error: error.message,
    });
  }
};

const changePassword = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.params?.userId;
    const { newPassword, oldPassword } = req.body;

    if (!userId) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ error: 'Invalid user ID' });
    }

    const user = await UserModel.findById(userId).session(session);

    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(httpStatus.NOT_FOUND).send({ error: 'User not found' });
    }

    // Compare old password with hashed password stored in the database
    const isMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isMatch) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).send({ error: "Password didn't match" });
    }

    // Hash the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update the password in the database
    user.password = hashedNewPassword;
    await user.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(httpStatus.OK).json({
      status: 'Success',
      message: 'Password changed successfully',
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      status: 'Fail',
      message: "Couldn't change password",
      error: error.message,
    });
  }
};

const updateUser = async (req, res) => {
  const userId = req.params?.userId;
  const data = req.body;
  const result = await authService.updateUserService(userId, data);
  if (result.modifiedCount == !1) {
    return new ApiError(
      httpStatus.NOT_FOUND,
      'User not found or no changes made',
    );
  }
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Update Successfully',
    data: result,
  });
};

const mg = mailgun.client({
  username: 'api',
  key: `${config.mailgun?.mailgun_key}`,
});

const sendMailWithMailGunController = async (req, res) => {
  try {
    const result = await mg.messages.create(config.mailgun?.mailgun_domain, {
      from: config.mailgun?.mailgun_from,
      to: [
        'anikh499@gmail.com',
        'anik561460@gmail.com',
        'rana286090@gmail.com ',
      ],
      subject: 'Verify Email',
      // text: 'Testing some Mailgun awesomeness!',
      html: '<h1>Testing some Mailgun awesomeness!</h1>',
    });
    res.status(201).send(result);
    logger.info(result); // logs response data
  } catch (error) {
    console.error(error); // logs any error
  }
};

export const authController = {
  ProtectCommonRoute,
  verifyAdmin,
  register,
  login,
  confirmEmail,
  getUser,
  getUserByEmail,
  getAllUsers,
  updateUser,
  forgetPassword,
  resetPassword,
  deleteUserAccount,
  deleteUserAccountOTP,
  changePassword,
  sendMailWithMailGunController,
};
