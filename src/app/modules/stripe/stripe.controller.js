import catchAsync from '../../../shared/catchAsync.js';
import httpStatus from 'http-status';
import Stripe from 'stripe';
import config from '../../../../config/index.js';
import UserModel from '../auth/auth.model.js';
import Tenant from '../tenant/tenant.model.js';
import ApiError from '../../../errors/ApiError.js';
import sendResponse from '../../../shared/sendResponse.js';
import { logger } from '../../../shared/logger.js';
import { createCustomerService, deleteCustomerService, retrieveAllCustomersService, retrieveAllProductsService, retrieveAllSubscriptionsService, retrieveCustomerService, updateCustomerService } from "./customer/stripe.service.js";
import { createPaymentIntentService, getAllPaymentMethodsService, savePaymentMethodService } from "./paymentMethod.service.js";
import { createProductService, retrieveAllPricesService, retrieveProductService } from "./products/product.service.js";
import { cancelSubscriptionService, createSubscriptionService, retrieveSubscriptionService, getCustomerSubscriptionsService } from "./subscription.service.js";
import SubscriptionModel from '../payment/payment.model.js';
import Product from './products/products.model.js';
import { withTenantFilter } from '../../helpers/tenantQuery.js';

const stripe = new Stripe(config.stripe.stripe_secret_key, {
  apiVersion: '2022-11-15',
});

/**
 * Helper function to get Stripe customer ID based on context
 * - Personal mode (currentTenantId: null) → user.stripeAccountId
 * - Organization mode (currentTenantId: ObjectId) → tenant.subscription.stripeCustomerId
 */
const getStripeCustomerId = async (req, throwOnMissing = true) => {
  const userId = req.user._id || req.user.userId || req.user.id;
  const currentTenantId = req.user?.currentTenantId;

  let customerId;
  let context;
  console.log('Getting Stripe customer ID for user:', userId, 'with tenant context:', currentTenantId);
  // Personal mode - use user's Stripe customer
  if (currentTenantId === null || currentTenantId === undefined) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }

    customerId = user.stripeAccountId;
    context = 'personal';

    if (!customerId && throwOnMissing) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'No Stripe customer found for user.');
    }
  }
  // Organization mode - use tenant's Stripe customer
  else {
    const tenant = await Tenant.findById(currentTenantId);
    if (!tenant) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Tenant not found');
    }

    customerId = tenant.subscription?.stripeCustomerId;
    context = 'organization';

    if (!customerId && throwOnMissing) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'No Stripe customer found for tenant.');
    }
  }

  return { customerId, context };
};

const createCustomerController = catchAsync(async (req, res, next) => {
  const user = req.user;

  const customer = await createCustomerService(req.body);
  res.status(201).json({ customer });
});

const getCustomerController = catchAsync(async (req, res, next) => {
  const { customerId, context } = await getStripeCustomerId(req);
  const customer = await retrieveCustomerService(customerId);

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Customer retrieved successfully',
    data: {
      context,
      customer,
    },
  });
});

const updateCustomerController = catchAsync(async (req, res, next) => {
  const { customerId, context } = await getStripeCustomerId(req);
  const updateData = req.body;
  const customer = await updateCustomerService(customerId, updateData);

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Customer updated successfully',
    data: {
      context,
      customer,
    },
  });
});

const deleteCustomerController = catchAsync(async (req, res, next) => {
  const { customerId, context } = await getStripeCustomerId(req);
  const confirmation = await deleteCustomerService(customerId);

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Customer deleted successfully',
    data: {
      context,
      confirmation,
    },
  });
});

const createProductController = catchAsync(async (req, res, next) => {
  await createProductService();
  res.status(201).json({ message: 'Products and prices created successfully' });
});

const retrieveProductController = catchAsync(async (req, res, next) => {
  const { productId } = req.params;
  const product = await retrieveProductService(productId);
  res.status(200).json({ product });
});

const createPaymentIntentController = catchAsync(async (req, res, next) => {
  const { amount, currency } = req.body;
  const { customerId, context } = await getStripeCustomerId(req);

  const paymentIntent = await createPaymentIntentService(amount, currency, customerId);

  return sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Payment intent created successfully',
    data: {
      context,
      customerId,
      paymentIntent,
    },
  });
});

const addPaymentMethodController = catchAsync(async (req, res, next) => {
  const { paymentMethodId } = req.body;
  const { customerId, context } = await getStripeCustomerId(req);

  const paymentMethod = await savePaymentMethodService(customerId, paymentMethodId);

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payment method added successfully',
    data: {
      context,
      customerId,
      paymentMethod,
    },
  });
});

const listPaymentMethodsController = catchAsync(async (req, res, next) => {
  const { customerId, type } = req.params;
  const paymentMethods = await getAllPaymentMethodsService(customerId, type);
  res.status(200).json({ paymentMethods });
});

/**
 * Get payment methods for current context (user or tenant)
 * - If currentTenantId is null: use user's stripeAccountId (personal mode)
 * - If currentTenantId exists: use tenant's stripeCustomerId (organization mode)
 */
const getMyPaymentMethodsController = catchAsync(async (req, res, next) => {
  const { customerId, context } = await getStripeCustomerId(req, false);

  if (!customerId) {
    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `No Stripe customer found for ${context}`,
      data: {
        context,
        paymentMethods: [],
        hasStripeCustomer: false,
      },
    });
  }

  // Fetch payment methods from Stripe
  const paymentMethods = await getAllPaymentMethodsService(customerId);

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payment methods retrieved successfully',
    data: {
      context,
      customerId,
      paymentMethods,
      hasStripeCustomer: true,
    },
  });
});

const createSubscriptionController = catchAsync(async (req, res, next) => {
  const { priceId } = req.body;
  const { customerId, context } = await getStripeCustomerId(req);

  const tenantId = req.user?.currentTenantId ?? null;
  const userId = req.user._id;

  const subscription = await createSubscriptionService(customerId, priceId, {
    userId: userId.toString(),
    tenantId: tenantId ? tenantId.toString() : 'personal',
  });

  // Fetch product to populate plan name and limits
  const product = await Product.findOne({ stripePriceId: priceId });

  // Map Stripe subscription status to our paymentStatus enum
  const paymentStatus = subscription.status === 'active' ? 'paid' : 'pending';

  // Copy plan limits from product features
  const limits = product ? {
    dailyRequestLimit: product.features.dailyRequestLimit,
    ragType: product.features.ragType,
    storagePerUser: product.features.storagePerUser,
    canInviteTeam: product.features.canInviteTeam,
  } : undefined;

  const query = { userId };
  console.log('Saving subscription to DB for user:', userId, 'with tenant context:', tenantId, withTenantFilter(req, query));
  const existingSubscription = await SubscriptionModel.findOne(withTenantFilter(req, query));
  console.log('Existing subscription found:', existingSubscription);
  if (existingSubscription) {
    // Update existing subscription record
    existingSubscription.stripeSubscriptionId = subscription.id;
    existingSubscription.stripeCustomerId = customerId;
    existingSubscription.stripePriceId = priceId;
    existingSubscription.price = priceId;
    existingSubscription.productId = product ? product._id : null;
    existingSubscription.plan_name = product ? product.plan : undefined;
    existingSubscription.paymentStatus = paymentStatus;
    existingSubscription.duration = product ? product.interval : undefined;
    existingSubscription.currentPeriodStart = subscription.current_period_start
      ? new Date(subscription.current_period_start * 1000)
      : undefined;
    existingSubscription.currentPeriodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : undefined;
    if (limits) existingSubscription.limits = limits;
    await existingSubscription.save();
    await Tenant.updateOne({ _id: tenantId }, { 'subscription.stripeCustomerId': customerId, 'subscription.stripeSubscriptionId': subscription.id, plan: product ? product.plan : undefined, limits });
  } else {
    const newSubscription = new SubscriptionModel({
      tenantId,
      userId,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customerId,
      stripePriceId: priceId,
      price: priceId,
      productId: product ? product._id : null,
      plan_name: product ? product.plan : undefined,
      paymentStatus,
      duration: product ? product.interval : undefined,
      currentPeriodStart: subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000)
        : undefined,
      currentPeriodEnd: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : undefined,
      limits,
    });
    await newSubscription.save();
  }

  return sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Subscription created successfully',
    data: {
      context,
      customerId,
      subscription,
    },
  });
});

const listPricesController = catchAsync(async (req, res, next) => {
  const prices = await retrieveAllPricesService(req.query);
  res.status(200).json({ prices });
});

const listAccounts = catchAsync(async (req, res, next) => {
  const accounts = await retrieveAllCustomersService();
  res.status(200).json({ accounts });
})

const listProducts = catchAsync(async (req, res, next) => {
  const products = await retrieveAllProductsService();
  res.status(200).json({ products });
})

const listSubscriptions = catchAsync(async (req, res, next) => {
  const subscriptions = await retrieveAllSubscriptionsService();
  res.status(200).json({ subscriptions });
})

const getSingleSubscription = catchAsync(async (req, res, next) => {
  const { subscriptionId } = req.params;
  const subscription = await retrieveSubscriptionService(subscriptionId);
  res.status(200).json({ subscription });
})


const cancelSubscriptionController = catchAsync(async (req, res, next) => {
  // Implementation for canceling a subscription
  const { subscriptionId } = req.params;
  const confirmation = await cancelSubscriptionService(subscriptionId);
  res.status(200).json({ confirmation });
});

/**
 * Get subscriptions for current context (user or tenant)
 * - If currentTenantId is null: use user's stripeAccountId (personal mode)
 * - If currentTenantId exists: use tenant's stripeCustomerId (organization mode)
 */
const getMySubscriptionsController = catchAsync(async (req, res, next) => {
  const { customerId, context } = await getStripeCustomerId(req, false);
  console.log('Customer ID for subscriptions:', customerId);
  if (!customerId) {
    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `No Stripe customer found for ${context}`,
      data: {
        context,
        subscriptions: [],
        hasStripeCustomer: false,
      },
    });
  }

  // Fetch subscriptions from Stripe
  const subscriptions = await getCustomerSubscriptionsService(customerId);

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Subscriptions retrieved successfully',
    data: {
      context,
      customerId,
      subscriptions,
      hasStripeCustomer: true,
    },
  });
});

/**
 * Get the single active subscription for the current context (personal or org).
 * Returns both the live Stripe object and the local DB record.
 */
const getMySubscriptionController = catchAsync(async (req, res, next) => {
  const { customerId, context } = await getStripeCustomerId(req, false);

  if (!customerId) {
    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `No Stripe customer found for ${context}`,
      data: {
        context,
        hasSubscription: false,
        hasStripeCustomer: false,
      },
    });
  }

  // Fetch active subscriptions from Stripe (returns array, take first)
  const stripeSubscriptions = await getCustomerSubscriptionsService(customerId);
  const activeStripeSubscription = stripeSubscriptions[0] || null;

  // Fetch the matching DB record
  const userId = req.user._id;
  const query = { userId };
  const dbRecord = await SubscriptionModel.findOne({
    ...withTenantFilter(req, query),
    paymentStatus: 'paid',
  }).sort({ updatedAt: -1 });

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Subscription retrieved successfully',
    data: {
      context,
      hasSubscription: !!activeStripeSubscription,
      hasStripeCustomer: true,
      subscription: activeStripeSubscription,
      dbRecord,
    },
  });
});

/**
 * Stripe webhook handler for direct-API subscriptions (Phase 5).
 * Handles events from subscriptions created via POST /stripe/subscription
 * (as opposed to the old checkout-session flow in payment.service.js).
 *
 * Route: POST /api/v1/stripe/webhook
 * Requires express.raw({ type: 'application/json' }) applied BEFORE express.json()
 */
const handleStripeWebhookController = async (req, res) => {
  const endpointSecret = config.stripe.stripe_webhook_secret_key;
  const sig = req.headers['stripe-signature'];

  if (!sig || !endpointSecret) {
    logger.error('[StripeWebhook] Missing signature or webhook secret');
    return res.status(400).send('Webhook Error: Missing Stripe Signature or Secret');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    logger.info('[StripeWebhook] Event received', { type: event.type, id: event.id });
  } catch (err) {
    logger.error('[StripeWebhook] Signature verification failed', { message: err.message });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      // ── Payment succeeded: mark subscription as paid, refresh period end ──
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const stripeSubscriptionId = invoice.subscription;
        if (!stripeSubscriptionId) break;

        const update = { paymentStatus: 'paid' };
        if (invoice.period_end) {
          update.currentPeriodEnd = new Date(invoice.period_end * 1000);
        }

        const updated = await SubscriptionModel.findOneAndUpdate(
          { stripeSubscriptionId },
          update,
          { new: true },
        );
        if (updated) {
          logger.info('[StripeWebhook] invoice.payment_succeeded: DB record updated', {
            stripeSubscriptionId,
            userId: updated.userId,
          });
        }
        break;
      }

      // ── Payment failed: mark subscription as pending ──
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const stripeSubscriptionId = invoice.subscription;
        if (!stripeSubscriptionId) break;

        const updated = await SubscriptionModel.findOneAndUpdate(
          { stripeSubscriptionId },
          { paymentStatus: 'pending' },
          { new: true },
        );
        if (updated) {
          logger.warn('[StripeWebhook] invoice.payment_failed: subscription marked pending', {
            stripeSubscriptionId,
            userId: updated.userId,
          });
        }
        break;
      }

      // ── Subscription updated (plan change, renewal, etc.) ──
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const priceId = subscription.items?.data?.[0]?.price?.id;

        // Look up product to refresh limits
        const product = priceId ? await Product.findOne({ stripePriceId: priceId }) : null;
        const limits = product
          ? {
            dailyRequestLimit: product.features.dailyRequestLimit,
            ragType: product.features.ragType,
            storagePerUser: product.features.storagePerUser,
            canInviteTeam: product.features.canInviteTeam,
          }
          : undefined;

        const update = {
          paymentStatus: subscription.status === 'active' ? 'paid' : 'pending',
        };
        if (priceId) update.stripePriceId = priceId;
        if (product) {
          update.plan_name = product.plan;
          update.duration = product.interval;
        }
        if (subscription.current_period_start) {
          update.currentPeriodStart = new Date(subscription.current_period_start * 1000);
        }
        if (subscription.current_period_end) {
          update.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
        }
        if (limits) update.limits = limits;

        const updated = await SubscriptionModel.findOneAndUpdate(
          { stripeSubscriptionId: subscription.id },
          update,
          { new: true },
        );
        if (updated) {
          logger.info('[StripeWebhook] customer.subscription.updated: DB record updated', {
            stripeSubscriptionId: subscription.id,
            userId: updated.userId,
          });
        }
        break;
      }

      // ── Subscription deleted / cancelled ──
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;

        const updated = await SubscriptionModel.findOneAndUpdate(
          { stripeSubscriptionId: subscription.id },
          { paymentStatus: 'canceled', canceledAt: new Date() },
          { new: true },
        );

        if (updated?.userId) {
          await UserModel.findByIdAndUpdate(updated.userId, { isSubscribed: false });
          logger.info('[StripeWebhook] customer.subscription.deleted: user.isSubscribed set false', {
            stripeSubscriptionId: subscription.id,
            userId: updated.userId,
          });
        }
        break;
      }

      default:
        logger.info('[StripeWebhook] Unhandled event type', { type: event.type });
        break;
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    logger.error('[StripeWebhook] Error processing event', {
      eventType: event.type,
      message: error.message,
      stack: error.stack,
    });
    return res.status(500).send(`Webhook handler error: ${error.message}`);
  }
};

export {
  createCustomerController,
  getCustomerController,
  updateCustomerController,
  deleteCustomerController,
  createProductController,
  retrieveProductController,
  createPaymentIntentController,
  addPaymentMethodController,
  listPaymentMethodsController,
  getMyPaymentMethodsController,
  createSubscriptionController,
  cancelSubscriptionController,
  getMySubscriptionsController,
  getMySubscriptionController,
  handleStripeWebhookController,
  listAccounts,
  listProducts,
  listSubscriptions,
  getSingleSubscription,
  listPricesController
};