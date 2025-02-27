import SubscriptionModel from '../../modules/payment/payment.model.js';

const limits = {
  personal: { prompts: 10, images: 10 },
  professional: { prompts: 250, images: 25 },
  business: { prompts: 500, images: 50 },
  enterprise: { prompts: 1000, images: 100 },
};

export const checkPromtsUsageLimits = async userId => {
  const subscription = await SubscriptionModel.findOne(
    { userId, paymentStatus: 'paid', expiresAt: { $gte: new Date() } }, // Ensure it's not expired
    {},
    { sort: { expiresAt: -1 } }, // Get the latest subscription first
  );

  if (!subscription) {
    throw new Error('No active subscription found.');
  }

  const planLimits = limits[subscription.plan_name];

  // ✅ Use correct field names inside `usage`
  if (subscription.usage.promptsUsed >= planLimits.prompts) {
    throw new Error(
      `Your ${subscription.plan_name} plan prompts limit reached..`,
    );
  }


  return subscription;
};


export const checkImageUsageLimits = async userId => {
  const subscription = await SubscriptionModel.findOne(
    { userId, paymentStatus: 'paid', expiresAt: { $gte: new Date() } }, // Ensure it's not expired
    {},
    { sort: { expiresAt: -1 } }, // Get the latest subscription first
  );

  if (!subscription) {
    throw new Error('No active subscription found.');
  }

  const planLimits = limits[subscription.plan_name];


  if (subscription.usage.imagesUsed >= planLimits.images) {
    throw new Error('Image generation limit reached.');
    throw new Error(
      `Your ${subscription.plan_name} plan image generation limit reached..`,
    );
  }

  return subscription;
};
