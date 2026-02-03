"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";

const plans = [
  {
    name: "Starter",
    monthlyPrice: 49,
    yearlyPrice: 39,
    description: "Perfect for small businesses just getting started",
    features: [
      "200 minutes/month (~67 calls)",
      "1 AI voice agent",
      "5 preset AI voices",
      "Basic call analytics",
      "Email support",
      "Business hours availability",
    ],
    popular: false,
  },
  {
    name: "Growth",
    monthlyPrice: 149,
    yearlyPrice: 119,
    description: "For growing businesses with higher call volume",
    features: [
      "750 minutes/month (~250 calls)",
      "3 AI voice agents",
      "Custom voice cloning",
      "Advanced analytics & reporting",
      "Priority support",
      "24/7 availability",
      "Full CRM integration",
      "3 team members",
    ],
    popular: true,
  },
  {
    name: "Business",
    monthlyPrice: 349,
    yearlyPrice: 279,
    description: "Enterprise-grade features for established businesses",
    features: [
      "Unlimited minutes",
      "Unlimited AI agents",
      "Custom voice cloning",
      "Real-time dashboard",
      "Dedicated account manager",
      "24/7 priority support",
      "Custom integrations",
      "White-label options",
      "API access",
      "Unlimited team members",
    ],
    popular: false,
  },
];

export function Pricing() {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section id="pricing" className="relative py-24 md:py-32 overflow-hidden">
      {/* Enhanced Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/5 to-background" />
      <div className="absolute inset-0 gradient-mesh opacity-30" />

      {/* Decorative orbs */}
      <div className="absolute top-1/4 left-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-10 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-3xl animate-float-delayed" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm font-semibold text-primary mb-6 shadow-soft">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            Pricing
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-foreground">
            Simple, transparent{" "}
            <span className="relative inline-block">
              <span className="text-gradient">pricing</span>
              <div className="absolute inset-0 blur-xl bg-gradient-to-r from-primary/30 to-secondary/30 -z-10" />
            </span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
            Start with a 14-day free trial. 50 minutes included. No credit card required.
          </p>

          {/* Enhanced billing toggle */}
          <div className="inline-flex items-center gap-2 p-2 rounded-2xl bg-secondary/30 shadow-elevated">
            <button
              onClick={() => setIsYearly(false)}
              className={`relative px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                !isYearly ? "text-white" : "text-foreground hover:text-primary"
              }`}
            >
              {!isYearly && <div className="absolute inset-0 gradient-primary rounded-xl shadow-glow" />}
              <span className="relative z-10">Monthly</span>
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`relative px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
                isYearly ? "text-white" : "text-foreground hover:text-primary"
              }`}
            >
              {isYearly && <div className="absolute inset-0 gradient-primary rounded-xl shadow-glow" />}
              <span className="relative z-10">Yearly</span>
              <span className="relative z-10 text-xs bg-white/20 px-2 py-1 rounded-full font-medium">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Enhanced pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`relative transition-all duration-500 ${
                plan.popular ? "md:scale-105 z-10" : "hover:scale-105"
              }`}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-20">
                  <div className="relative px-6 py-2 rounded-full gradient-primary shadow-glow">
                    <div className="absolute inset-0 rounded-full bg-white/20 blur-sm" />
                    <span className="relative text-primary-foreground text-sm font-bold tracking-wide">Most Popular</span>
                  </div>
                </div>
              )}

              <div className={`h-full p-8 lg:p-10 rounded-3xl relative overflow-hidden ${
                plan.popular
                  ? "glass-strong shadow-elevated"
                  : "glass-card hover:shadow-elevated"
              } transition-all duration-500 group`}>
                {/* Animated background */}
                <div className={`absolute inset-0 ${
                  index % 2 === 0 ? 'bg-gradient-to-br from-primary/5' : 'bg-gradient-to-br from-secondary/5'
                } to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className={`absolute -right-16 -bottom-16 w-56 h-56 ${
                  index % 2 === 0 ? 'bg-primary/10' : 'bg-secondary/10'
                } rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-all duration-500`} />

                <div className="relative z-10">
                  {/* Header */}
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-card-foreground mb-3">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>
                    <div className="flex items-baseline justify-center gap-2 mb-2">
                      <span className="text-5xl md:text-6xl font-bold text-foreground">
                        ${isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                      </span>
                      <span className="text-muted-foreground text-lg">/month</span>
                    </div>
                    {isYearly && (
                      <p className="text-sm text-primary font-medium">
                        Billed annually (${plan.yearlyPrice * 12}/year)
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full gradient-primary shadow-glow flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-4 h-4 text-primary-foreground" />
                        </div>
                        <span className="text-card-foreground leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Link href="/auth/signup">
                    <Button
                      variant={plan.popular ? "hero" : "outline"}
                      size="lg"
                      className={`w-full ${plan.popular ? 'shadow-glow' : 'hover:shadow-card'} transition-all duration-300`}
                    >
                      Get Started
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          {[
            "14-day free trial",
            "No credit card required",
            "Cancel anytime"
          ].map((badge) => (
            <div key={badge} className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              <span>{badge}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
