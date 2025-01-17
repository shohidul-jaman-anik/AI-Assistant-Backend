import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import formData from 'form-data';
import httpStatus from 'http-status';
import Mailgun from 'mailgun.js';
import mongoose from 'mongoose';
import config from '../../../../config/index.js';
import pick from '../../middlewares/other/pick.js';
import { sendMailWithMailGun } from '../../middlewares/sendEmail/sendMailWithMailGun.js';
import UserModel from './auth.model.js';
import { getAllUsersService } from './auth.service.js';
import {
  deleteUserOtpTemplate,
  forgetPassOtpTemplate,
  generateOTP,
  registrationOtpTemplate,
} from './auth.utils.js';

const mailgun = new Mailgun(formData);

const ProtectCommonRoute = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  // console.log(authHeader, 'authHeaderrrrrrrr');
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

const register = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { password, confirmPassword, email } = req.body;

    const existingEmail = await UserModel.findOne({ email }).session(session);
    if (existingEmail) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(httpStatus.CONFLICT)
        .send({ error: 'Email already exists!' });
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await UserModel.create(
        [
          {
            email,
            password: hashedPassword,
          },
        ],
        { session },
      );

      const token = user[0].generateConfirmationToken();
      await user[0].save({ session, validateBeforeSave: false });

      const mailData = await registrationOtpTemplate(email, token);

      // Sending email and handling success or failure
      await sendMailWithMailGun(mailData);

      // Commit transaction if everything succeeds
      await session.commitTransaction();
      session.endSession();

      return res.status(httpStatus.CREATED).json({
        status: httpStatus.CREATED,
        message: 'Please verify your E-mail.',
      });
    }
  } catch (error) {
    // Roll back transaction on error
    await session.abortTransaction();
    session.endSession();
    console.error(error);
    return res.status(500).json({
      status: 'Fail',
      message: "Couldn't register successfully",
      error: error.message,
    });
  }
};

const confirmEmail = async (req, res) => {
  try {
    const { token } = req.params;
    console.log(token, 'tokennnnnnn');

    const user = await UserModel.findOne({ confirmationToken: token });

    if (!user) {
      return res.status(403).json({
        status: 'fail',
        error: 'Invalid token',
      });
    }

    const expired = new Date() > new Date(user.confirmationTokenExpires);

    if (expired) {
      return res.status(401).json({
        status: 'fail',
        error: 'Token expired',
      });
    }

    user.role = 'user';
    user.confirmationToken = undefined;
    user.confirmationTokenExpires = undefined;

    await user.save({ validateBeforeSave: false });

    res.status(302).redirect('https://www.asonai.com');
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: 'fail',
      error,
    });
  }
};

const login = async (req, res, next) => {
  // console.log(req.body, 'data login');
  const { email, password } = req.body;

  try {
    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(404).send({ error: 'Email not found' });
    }
    if (user.role === 'unauthorized') {
      return res.status(404).send({ error: 'Please verify your mail' });
    }

    const passwordCheck = await bcrypt.compare(password, user.password);

    if (!passwordCheck) {
      return res.status(400).send({ error: "Password doesn't match" });
    }

    const token = jwt.sign(
      {
        email: user.email,
        role: user.role,
      },
      config.jwt_secret,
      { expiresIn: '7d' },
    );

    return res.status(200).send({
      mgs: 'Login successful...!',
      email: user.email,
      token,
    });
  } catch (error) {
    return res.status(500).send(error);
  }
};

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
    console.log(userEmail, 'userId');

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
    console.log(userId, 'userId');

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

    const users = await getAllUsersService(filters, paginationOptions);
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

async function updateUser(req, res) {
  try {
    const userId = req.params?.userId;
    if (!userId) {
      return res.status(400).send({ error: 'User ID is required.' });
    }
    const user = UserModel.findOne({ _id: userId });

    if (!user) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ error: 'User not found.' });
    }

    const { email, password, ...body } = req.body; // Exclude email and password from the update

    if (Object.keys(body).length === 0) {
      return res.status(400).send({ error: 'No valid fields to update.' });
    }

    // Update the data
    const result = await UserModel.updateOne({ _id: userId }, body);
    console.log(result, 'result');

    if (result.modifiedCount === 1) {
      return res.status(200).send({ message: 'Record Updated...!' });
    } else {
      return res
        .status(404)
        .send({ error: 'User Not Found or No Changes Made...!' });
    }
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).send({ error: 'Internal Server Error.' });
  }
}

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
    console.log(result); // logs response data
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
