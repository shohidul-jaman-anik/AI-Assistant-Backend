import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
import UserModel from '../auth/auth.model.js';
import SubscriptionModel from './payment.model.js';
import moment from 'moment';


const createCheckoutSessionService = async (user, plan) => {
  if (!['personal', 'professional', 'business', 'enterprise'].includes(plan.plan_name)) {
    throw new Error('Invalid plan name');
  }
  if (!['month', 'year'].includes(plan.duration)) {
    throw new Error('Invalid plan duration');
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    customer_email: user.email,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: plan.plan_name },
          unit_amount: plan.price * 100,
          recurring: { interval: plan.duration },
        },
        quantity: 1,
      },
    ],
    mode: 'subscription',
    metadata: {
      plan_name: plan.plan_name,
      duration: plan.duration,
    },
    // success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    // success_url: `${process.env.CLIENT_URL}`,
    // cancel_url: `${process.env.CLIENT_URL}`,
    success_url: `${process.env.BASE_URL}`,
    cancel_url: `${process.env.BASE_URL}`,
  });

  return session.url;
};


const handleWebhookService = async (req, res) => {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers['stripe-signature'];

  if (!sig || !endpointSecret) {
    return res.status(400).send('Webhook Error: Missing Stripe Signature or Secret');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    return res.status(400).send(`Webhook signature verification failed. ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const user = await UserModel.findOne({ email: session.customer_email });

      if (!user) {
        console.warn(`⚠️ No user found with email: ${session.customer_email}`);
        return res.status(404).send('User not found');
      }

      const subscriptionData = {
        userId: user._id,
        transactionId: session.id,
        price: session.amount_total / 100,
        plan_name: session.metadata.plan_name,
        duration: session.metadata.duration,
        expiresAt: getExpirationDate(session.metadata.duration),
        paymentStatus: session.payment_status || 'pending',
        invoiceUrl: null,
      };

      if (session.subscription) {
        try {
          const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription);
          if (stripeSubscription.latest_invoice) {
            const invoice = await stripe.invoices.retrieve(stripeSubscription.latest_invoice);
            subscriptionData.invoiceUrl = invoice.hosted_invoice_url;
          }
        } catch (error) {
          console.error('⚠️ Error retrieving invoice:', error.message);
        }
      }

      const newSubscription = new SubscriptionModel(subscriptionData);
      user.isSubscribed = true;
      user.subscription = {
        price: session.amount_total / 100,
        plan_name: session.metadata.plan_name,
        duration: session.metadata.duration,
        expiresAt: getExpirationDate(session.metadata.duration),
      };

      await Promise.all([newSubscription.save(), user.save()]);

      console.log('✅ Subscription created and user updated successfully.');
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;

      const existingSubscription = await SubscriptionModel.findOne({ transactionId: subscription.id });
      if (existingSubscription) {
        existingSubscription.paymentStatus = 'expired';
        await existingSubscription.save();

        const user = await UserModel.findById(existingSubscription.userId);
        if (user) {
          user.isSubscribed = false;
          user.subscription = null;
          await user.save();
          console.log(`🚨 User subscription status updated: ${user.email}`);
        }
      }
    }

    res.status(200).send('Webhook processed successfully');
  } catch (error) {
    console.error('❌ Error processing webhook:', error.message);
    res.status(500).send('Internal server error');
  }
};

const getExpirationDate = (duration) => {
  return duration === "month"
    ? moment().add(1, 'months').toDate()
    : moment().add(1, 'years').toDate();
};

export const PaymentService = {
  createCheckoutSessionService,
  handleWebhookService,
};