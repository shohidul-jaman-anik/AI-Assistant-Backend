import bcrypt from 'bcryptjs';
import httpStatus from 'http-status';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import config from '../../../../config/index.js';
import ApiError from '../../../errors/ApiError.js';
import paginationHelpers from '../../helpers/paginationHelpers.js';
import { sendMailWithMailGun } from '../../middlewares/sendEmail/sendMailWithMailGun.js';
import UserModel from './auth.model.js';
import { registrationOtpTemplate } from './auth.utils.js';

const getAllUsersService = async (filters, paginationOptions) => {
  const { searchTerm } = filters;

  const productsSearchAbleFields = ['username', 'email'];
  const andConditions = [];

  // Add a default condition if andConditions is empty
  if (andConditions.length === 0) {
    andConditions.push({});
  }

  if (searchTerm) {
    andConditions.push({
      $or: productsSearchAbleFields.map(field => ({
        [field]: { $regex: searchTerm, $options: 'i' },
      })),
    });
  }

  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelpers.calculatePagination(paginationOptions);

  const sortConditions = {};
  if (sortBy && sortOrder) {
    sortConditions[sortBy] = sortOrder;
  }

  const users = await UserModel.find({ $and: andConditions })
    .sort(sortConditions)
    .skip(skip)
    .limit(limit);

  const total = await UserModel.estimatedDocumentCount();
  const totalSeller = await UserModel.countDocuments({
    $and: [{ seller: true }, { role: 'seller' }],
  });
  const totalBuyer = await UserModel.countDocuments({ role: 'buyer' });
  return {
    meta: {
      page,
      limit,
      total,
      totalSeller,
      totalBuyer,
    },
    data: users,
  };
};

const deleteUserAccountService = async userId => {
  const result = await UserModel.deleteOne({ _id: userId });
  return result;
};

const registerService = async req => {
  const session = await mongoose.startSession();
  let transactionAborted = false;

  try {
    session.startTransaction();

    const { password, confirmPassword, email } = req.body;

    const existingEmail = await UserModel.findOne({ email }).session(session);
    if (existingEmail) {
      transactionAborted = true;
      await session.abortTransaction();
      session.endSession();
      return new ApiError(httpStatus.CONFLICT, 'Email already exists!');
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
    }

    session.endSession();
    if (!transactionAborted) {
      return new ApiError(httpStatus.CREATED, 'Please verify your E-mail.');
    }
  } catch (error) {
    if (!transactionAborted) {
      // Roll back transaction on error
      await session.abortTransaction();
    }
    session.endSession();
    console.error(error);

    return new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Couldn't register successfully",
    );
  }
};

const confirmEmailService = async token => {
  const user = await UserModel.findOne({ confirmationToken: token });

  if (!user) {
    return new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const expired = new Date() > new Date(user.confirmationTokenExpires);

  if (expired) {
    return new ApiError(
      httpStatus.UNAUTHORIZED,
      'Token expired, please register again',
    );
  }

  user.role = 'user';
  user.confirmationToken = undefined;
  user.confirmationTokenExpires = undefined;

  await user.save({ validateBeforeSave: false });

  return { success: true };
};

const loginService = async (email, password) => {
  if (!email || !password) {
    return new ApiError(
      httpStatus.BAD_REQUEST,
      'Email and password are required',
    );
  }
  const user = await UserModel.findOne({ email });

  if (!user) {
    return new ApiError(
      httpStatus.NOT_FOUND,
      'User not found, please register first',
    );
  }
  if (user.role === 'unauthorized') {
    return new ApiError(
      httpStatus.UNAUTHORIZED,
      'Please verify your email first',
    );
  }

  if (!user.password) {
    return new ApiError(
      httpStatus.BAD_REQUEST,
      'This account was created using social login. Please log in using your social provider.',
    );
  }

  const passwordCheck = await bcrypt.compare(password, user.password);

  if (!passwordCheck) {
    return new ApiError(httpStatus.UNAUTHORIZED, 'Invalid credentials');
  }

  const token = jwt.sign(
    {
      email: user.email,
      role: user.role,
    },
    config.jwt_secret,
    { expiresIn: '7d' },
  );

  return {
    email: user?.email,
    token,
  };
};

const updateUserService = async (userId, data) => {
  try {
    if (!userId) {
      return new ApiError(httpStatus.BAD_REQUEST, 'User ID is required.');
    }
    const user = UserModel.findOne({ _id: userId });

    if (!user) {
      return new ApiError(httpStatus.NOT_FOUND, 'User not found.');
    }

    const { email, password, ...updateData } = data; // Avoid updating email/password

    if (Object.keys(updateData).length === 0) {
      return new ApiError(httpStatus.BAD_REQUEST, 'No valid fields to update.');
    }

    // Update the data
    const result = await UserModel.updateOne({ _id: userId }, updateData);
    console.log(result, 'result');
    return result;
  } catch (error) {
    console.error('Error updating user:', error);
    return new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Internal Server Error',
    );
  }
};

export const authService = {
  getAllUsersService,
  deleteUserAccountService,
  registerService,
  confirmEmailService,
  loginService,
  updateUserService,
};
