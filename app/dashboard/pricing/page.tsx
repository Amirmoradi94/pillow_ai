'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  minutes: number;
  concurrency: number;
  features: string[];
  stripePriceId: string;
  popular?: boolean;
}

const plans: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    interval: 'month',
    minutes: 200,
    concurrency: 5,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || '',
    features: [
      '200 minutes/month (~67 calls)',
      '1 AI voice agent',
      '5 preset AI voices',
      'Basic call analytics',
      'Email support',
      'Business hours availability',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 149,
    interval: 'month',
    minutes: 750,
    concurrency: 15,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID || '',
    popular: true,
    features: [
      '750 minutes/month (~250 calls)',
      '3 AI voice agents',
      'Custom voice cloning',
      'Advanced analytics & reporting',
      'Priority support',
      '24/7 availability',
      'Full CRM integration',
      '3 team members',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: 349,
    interval: 'month',
    minutes: 999999,
    concurrency: 50,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID || '',
    features: [
      'Unlimited minutes',
      'Unlimited AI agents',
      'Custom voice cloning',
      'Real-time dashboard',
      'Dedicated account manager',
      '24/7 priority support',
      'Custom integrations',
      'White-label options',
      'API access',
      'Unlimited team members',
    ],
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleSelectPlan = async (plan: PricingPlan) => {
    setLoading(plan.id);
    setError('');

    try {
      // Create Stripe checkout session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: plan.stripePriceId,
          planId: plan.id,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();

      // Redirect to Stripe checkout
      window.location.href = url;
    } catch (err: any) {
      setError(err.message);
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold">Choose Your Plan</h1>
          <p className="text-lg text-muted-foreground">
            Upgrade to unlock more minutes and features
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg bg-destructive/10 p-4 text-center text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border bg-card p-8 shadow-sm transition-all hover:shadow-md ${
                plan.popular ? 'border-primary shadow-lg' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-1 text-xs font-semibold text-white">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <div className="mb-6">
                <h3 className="mb-2 text-2xl font-bold">{plan.name}</h3>
                <div className="mb-4 flex items-baseline">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="ml-2 text-muted-foreground">/{plan.interval}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {plan.id === 'business'
                    ? `Unlimited minutes • ${plan.concurrency} concurrent calls`
                    : `${plan.minutes.toLocaleString()} minutes • ${plan.concurrency} concurrent calls`
                  }
                </p>
              </div>

              {/* Features List */}
              <ul className="mb-8 space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="h-5 w-5 shrink-0 text-primary" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Select Button */}
              <button
                onClick={() => handleSelectPlan(plan)}
                disabled={loading !== null}
                className={`w-full rounded-lg px-6 py-3 font-semibold transition-all ${
                  plan.popular
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                    : 'border border-primary bg-background text-primary hover:bg-primary/5'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading === plan.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  'Select Plan'
                )}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ or Additional Info */}
        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground">
            All plans include a 14-day money-back guarantee. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
