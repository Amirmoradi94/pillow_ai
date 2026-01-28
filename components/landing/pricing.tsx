import { Check } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "99",
    description: "Perfect for small businesses getting started",
    features: [
      "1 AI Voice Agent",
      "Local Phone Number",
      "Up to 500 calls/month",
      "Basic Analytics",
      "Email Support",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
  {
    name: "Professional",
    price: "249",
    description: "Most popular for growing businesses",
    features: [
      "3 AI Voice Agents",
      "Multiple Phone Numbers",
      "Up to 2,000 calls/month",
      "Advanced Analytics",
      "Priority Support",
      "Custom Scripts",
      "Call Recording",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "499",
    description: "For established businesses with high call volume",
    features: [
      "Unlimited AI Voice Agents",
      "Unlimited Phone Numbers",
      "Unlimited calls/month",
      "Full Analytics Suite",
      "Dedicated Account Manager",
      "White-label Dashboard",
      "API Access",
      "Custom Integrations",
      "24/7 Phone Support",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export function Pricing() {
  return (
    <section className="bg-background py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-muted-foreground">
            Choose the plan that fits your business needs. No hidden fees.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-lg border bg-card p-8 transition-all hover:shadow-lg ${
                plan.popular ? "border-primary shadow-lg scale-105" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                    Most Popular
                  </span>
                </div>
              )}
              <div className="mb-4">
                <h3 className="text-2xl font-semibold">{plan.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold">${plan.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="mb-8 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <Check className="h-5 w-5 flex-shrink-0 text-primary" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                className={`w-full rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                  plan.popular
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
