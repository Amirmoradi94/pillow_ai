# Stripe Integration Setup Guide

## Overview
This guide will help you set up Stripe payment integration for Pillow AI subscription plans.

---

## Step 1: Create Stripe Account
1. Go to [https://stripe.com](https://stripe.com)
2. Sign up for a Stripe account
3. Complete your business verification

---

## Step 2: Get Your API Keys

### 2.1 Secret Key & Publishable Key
1. Go to Stripe Dashboard → **Developers** → **API Keys**
2. Copy the following keys:
   - **Secret Key** (starts with `sk_test_...` for test mode)
   - **Publishable Key** (starts with `pk_test_...` for test mode)
3. Add them to your `.env.local` file:
   ```env
   STRIPE_SECRET_KEY=sk_test_your_secret_key_here
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
   ```

---

## Step 3: Create Products and Prices

### 3.1 Create Starter Plan
1. Go to **Products** → **Add product**
2. Fill in the details:
   - **Name**: Starter Plan
   - **Description**: 200 minutes per month (~67 calls), 1 AI voice agent
   - **Pricing**: $49/month (Recurring)
   - Click **Save product**
3. After creating, click on the price to view details
4. Copy the **Price ID** (starts with `price_...`)
5. Add to `.env.local`:
   ```env
   NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID=price_your_starter_price_id
   ```

### 3.2 Create Growth Plan
1. Go to **Products** → **Add product**
2. Fill in the details:
   - **Name**: Growth Plan
   - **Description**: 750 minutes per month (~250 calls), 3 AI voice agents
   - **Pricing**: $149/month (Recurring)
   - Click **Save product**
3. Copy the **Price ID**
4. Add to `.env.local`:
   ```env
   NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID=price_your_growth_price_id
   ```

### 3.3 Create Business Plan
1. Go to **Products** → **Add product**
2. Fill in the details:
   - **Name**: Business Plan
   - **Description**: Unlimited minutes, unlimited AI agents
   - **Pricing**: $349/month (Recurring)
   - Click **Save product**
3. Copy the **Price ID**
4. Add to `.env.local`:
   ```env
   NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID=price_your_business_price_id
   ```

---

## Step 4: Set Up Webhook

### 4.1 Create Webhook Endpoint
1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your webhook URL:
   - **Development**: `https://your-domain.ngrok.io/api/stripe/webhook`
   - **Production**: `https://your-domain.com/api/stripe/webhook`

### 4.2 Select Events to Listen
Select the following events:
- ✅ `checkout.session.completed`
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`
- ✅ `customer.subscription.deleted`

### 4.3 Get Webhook Secret
1. After creating the webhook, click to view details
2. Click **Reveal** under "Signing secret"
3. Copy the webhook secret (starts with `whsec_...`)
4. Add to `.env.local`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   ```

---

## Step 5: Test Webhook Locally (Development)

### 5.1 Install Stripe CLI
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe

# Linux
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_linux_x86_64.tar.gz
tar -xvf stripe_linux_x86_64.tar.gz
```

### 5.2 Login to Stripe CLI
```bash
stripe login
```

### 5.3 Forward Webhooks to Local Server
```bash
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

This will give you a webhook signing secret starting with `whsec_...`
Use this for local development.

---

## Step 6: Install Stripe Package

```bash
npm install stripe
```

---

## Step 7: Environment Variables Checklist

Make sure your `.env.local` file has ALL of these:

```env
# Stripe Keys (REQUIRED)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (REQUIRED)
NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID=price_...

# Supabase Service Role (REQUIRED for webhook)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## Step 8: Test the Integration

### 8.1 Run Your App
```bash
npm run dev
```

### 8.2 Test Checkout Flow
1. Sign up for a new account
2. Click **Upgrade** in the sidebar
3. Select a plan
4. Use Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/34)
   - CVC: Any 3 digits (e.g., 123)
   - ZIP: Any 5 digits (e.g., 12345)
5. Complete the checkout
6. Verify subscription updated in database

---

## Step 9: Going to Production

When ready for production:

1. **Switch to Live Mode** in Stripe Dashboard
2. Get your **live API keys**:
   - `sk_live_...` (Secret Key)
   - `pk_live_...` (Publishable Key)
3. Create live products and prices
4. Create live webhook endpoint with your production domain
5. Update `.env.production` with live keys

---

## Troubleshooting

### Webhook not receiving events
- Check webhook endpoint URL is correct
- Verify webhook is active in Stripe Dashboard
- Check selected events include the ones listed above
- For local dev, ensure `stripe listen` is running

### Payment succeeded but subscription not updated
- Check Stripe webhook logs in Dashboard
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set
- Check server logs for errors in webhook handler

### Test card not working
- Ensure you're in **Test Mode** in Stripe Dashboard
- Use test card number: `4242 4242 4242 4242`
- Use any future expiry date and valid CVC

---

## Summary: What You Need to Provide

From Stripe Dashboard, you need:

1. ✅ **Secret Key** (`sk_test_...`)
2. ✅ **Publishable Key** (`pk_test_...`)
3. ✅ **Webhook Secret** (`whsec_...`)
4. ✅ **Starter Plan Price ID** (`price_...`) - $49/month
5. ✅ **Growth Plan Price ID** (`price_...`) - $149/month
6. ✅ **Business Plan Price ID** (`price_...`) - $349/month

That's it! Add these 6 values to your `.env.local` file and you're ready to go.
