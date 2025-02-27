import mongoose from 'mongoose';
import catchAsync from '../../../shared/catchAsync.js';
import sendResponse from '../../../shared/sendResponse.js';
import UserModel from '../auth/auth.model.js';
import SubscriptionModel from './payment.model.js';
import { PaymentService } from './payment.service.js';
import { checkImageUsageLimits, checkPromtsUsageLimits, checkUsageLimits } from '../../middlewares/checkUsageLimits/checkUsageLimits.js';
import { checkFreePlanLimits } from '../../middlewares/checkFreePlanLimits/checkFreePlanLimits.js';

const createCheckoutSession = catchAsync(async (req, res, next) => {
  const { userId, plan } = req.body;
  console.log(userId,plan)
  
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    console.error('Invalid User ID:', userId);
    return res.status(400).json({ error: 'Invalid User ID' });
  }

  const user = await UserModel.findById(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const sessionUrl = await PaymentService.createCheckoutSessionService(user, plan);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Checkout session created successfully",
    data: { url: sessionUrl },
  });
});

const handleWebhook = catchAsync(async (req, res, next) => {
  await PaymentService.handleWebhookService(req, res);
});


const getAllSubscriptions = catchAsync(async (req, res, next) => {
  const subscriptions = await SubscriptionModel.find({}).sort({ createdAt: -1 }); // ✅ Sort by latest first
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "All subscriptions fetched successfully",
        data: subscriptions,
    });
});


const getSubscriptionsByUserId = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: "User ID is required" });

  const subscriptions = await SubscriptionModel.find({ userId })
    .populate('userId', 'email')
    .sort({ createdAt: -1 }); // ✅ Sort by latest first

  if (!subscriptions.length) {
      return sendResponse(res, {
          statusCode: 404,
          success: false,
          message: "No subscriptions found for this user",
      });
  }

  sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "User subscriptions fetched successfully",
      data: subscriptions,
  });
});


const incrementPromptsUsed = async (userId) => {
  try {
    const user = await checkFreePlanLimits(userId, 'prompt');

    if (user.isSubscribed) {
      const subscription = await checkPromtsUsageLimits(userId);
      console.log("Subscription check result:", subscription);

      if (!subscription || !subscription._id) {
        throw new Error('Subscription not found or invalid.');
      }

      await SubscriptionModel.updateOne(
        { _id: subscription._id },
        { $inc: { 'usage.promptsUsed': 1 } }
      );
    } else {
      // Increment free plan usage
      user.freePlanUsage.promptsUsed += 1;
      await user.save();
    }

    return { success: true, message: 'Prompt usage updated successfully.' };

  } catch (error) {
    console.error('Error in incrementPromptsUsed:', error);
    return { success: false, message: error.message };
  }
};



const incrementImagesUsed = async (userId) => {
  try {
    const user = await checkFreePlanLimits(userId, 'image');

    if (user.isSubscribed) {
      const subscription = await checkImageUsageLimits(userId);
      console.log("Subscription check result:", subscription);

      if (!subscription || !subscription._id) {
        throw new Error('Subscription not found or invalid.');
      }

      await SubscriptionModel.updateOne(
        { _id: subscription._id },
        { $inc: { 'usage.imagesUsed': 1 } }
      );
    } else {
      // Increment free plan usage
      user.freePlanUsage.imagesUsed += 1;
      await user.save();
    }

    return { success: true, message: 'Image usage updated successfully.' };

  } catch (error) {
    console.error('Error in incrementImagesUsed:', error);
    return { success: false, message: error.message || 'An error occurred while updating image usage.' };
  }
};



export const paymentController = {
    createCheckoutSession,
    handleWebhook,
    getAllSubscriptions,
    getSubscriptionsByUserId,
    incrementPromptsUsed,
    incrementImagesUsed
};