import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Plan configurations
const planConfigs: Record<string, { minutes: number; concurrency: number }> = {
  starter: { minutes: 200, concurrency: 5 },
  growth: { minutes: 750, concurrency: 15 },
  business: { minutes: 999999, concurrency: 50 }, // Unlimited minutes
};

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // Create Supabase client with service role key for admin access
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const tenantId = session.metadata.tenantId;
        const planId = session.metadata.planId;

        if (!tenantId || !planId) {
          console.error('Missing metadata in checkout session');
          break;
        }

        const planConfig = planConfigs[planId];
        if (!planConfig) {
          console.error('Invalid plan ID:', planId);
          break;
        }

        // Calculate period dates (monthly billing)
        const periodStart = new Date();
        const periodEnd = new Date();
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        // Update tenant subscription
        const { error: updateError } = await supabase
          .from('tenants')
          .update({
            subscription_tier: planId,
            subscription_status: 'active',
            monthly_minutes_limit: planConfig.minutes,
            minutes_used_current_period: 0,
            concurrency_limit: planConfig.concurrency,
            period_starts_at: periodStart.toISOString(),
            period_ends_at: periodEnd.toISOString(),
            trial_ends_at: null, // Clear trial
          })
          .eq('id', tenantId);

        if (updateError) {
          console.error('Error updating tenant:', updateError);
        } else {
          console.log(`Subscription activated for tenant ${tenantId}`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const subscription = await stripe.subscriptions.retrieve(
          invoice.subscription
        );
        const tenantId = subscription.metadata.tenantId;
        const planId = subscription.metadata.planId;

        if (!tenantId || !planId) {
          console.error('Missing metadata in subscription');
          break;
        }

        const planConfig = planConfigs[planId];
        if (!planConfig) {
          console.error('Invalid plan ID:', planId);
          break;
        }

        // Reset minutes for new billing period
        const periodStart = new Date(invoice.period_start * 1000);
        const periodEnd = new Date(invoice.period_end * 1000);

        const { error: updateError } = await supabase
          .from('tenants')
          .update({
            minutes_used_current_period: 0,
            period_starts_at: periodStart.toISOString(),
            period_ends_at: periodEnd.toISOString(),
            subscription_status: 'active',
          })
          .eq('id', tenantId);

        if (updateError) {
          console.error('Error resetting minutes:', updateError);
        } else {
          console.log(`Minutes reset for tenant ${tenantId}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const tenantId = subscription.metadata.tenantId;

        if (!tenantId) {
          console.error('Missing tenant ID in subscription metadata');
          break;
        }

        // Mark subscription as cancelled
        const { error: updateError } = await supabase
          .from('tenants')
          .update({
            subscription_status: 'cancelled',
          })
          .eq('id', tenantId);

        if (updateError) {
          console.error('Error cancelling subscription:', updateError);
        } else {
          console.log(`Subscription cancelled for tenant ${tenantId}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscription = await stripe.subscriptions.retrieve(
          invoice.subscription
        );
        const tenantId = subscription.metadata.tenantId;

        if (!tenantId) {
          console.error('Missing tenant ID');
          break;
        }

        // Mark subscription as expired
        const { error: updateError } = await supabase
          .from('tenants')
          .update({
            subscription_status: 'expired',
          })
          .eq('id', tenantId);

        if (updateError) {
          console.error('Error updating failed payment:', updateError);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
