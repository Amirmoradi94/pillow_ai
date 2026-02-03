"use client";

import { ChevronDown, HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "How long does it take to set up?",
    answer: "You can have your AI voice agent up and running in less than 15 minutes. Our simple onboarding process guides you through customizing your agent's personality, knowledge base, and call handling preferences. No coding or technical expertise required.",
  },
  {
    question: "Can I customize what the AI says?",
    answer: "Absolutely! You have full control over your AI agent's responses, personality, and knowledge base. You can set specific scripts for common questions, customize greetings, and train the AI on your unique business information.",
  },
  {
    question: "How natural do the conversations sound?",
    answer: "Our AI uses advanced natural language processing to deliver remarkably human-like conversations. It understands context, handles interruptions gracefully, and responds with appropriate pauses and inflections. Most callers don't realize they're speaking with AI.",
  },
  {
    question: "What happens if the AI can't answer a question?",
    answer: "When the AI encounters a question it can't confidently answer, it gracefully transfers the call to a human team member or takes a message. You can customize this fallback behavior based on your preferences.",
  },
  {
    question: "Is my customer data secure?",
    answer: "Security is our top priority. All data is encrypted in transit and at rest. We're SOC 2 compliant and HIPAA-ready for healthcare providers. We never share or sell your customer data.",
  },
  {
    question: "Can I use my own voice?",
    answer: "Yes! With our Growth and Business plans, you can clone your own voice or choose from our library of premium AI voices. This helps maintain brand consistency and creates a more personalized experience for your callers.",
  },
  {
    question: "Do you offer a free trial?",
    answer: "Yes, we offer a 14-day free trial with full access to all features. No credit card required to start. You can upgrade or cancel anytime during the trial period.",
  },
  {
    question: "What integrations do you support?",
    answer: "We integrate with popular CRM systems, scheduling tools, and business software including Salesforce, HubSpot, Google Calendar, Calendly, and more. Custom API integrations are available on the Business plan.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="relative py-24 md:py-32 overflow-hidden">
      {/* Enhanced background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      <div className="absolute inset-0 gradient-mesh opacity-30" />

      {/* Decorative elements */}
      <div className="absolute top-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 left-10 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl animate-float-delayed" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm font-semibold text-primary mb-6 shadow-soft">
            <HelpCircle className="w-3.5 h-3.5" />
            FAQ
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-foreground">
            Frequently asked{" "}
            <span className="relative inline-block">
              <span className="text-gradient">questions</span>
              <div className="absolute inset-0 blur-xl bg-gradient-to-r from-primary/30 to-secondary/30 -z-10" />
            </span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            Everything you need to know about Pillow AI. Can't find an answer?
            Contact our support team.
          </p>
        </div>

        {/* Enhanced FAQ items */}
        <div className="max-w-4xl mx-auto space-y-4">
          {faqs.map((faq, index) => (
            <details
              key={index}
              className="group glass-card rounded-2xl shadow-card hover:shadow-elevated transition-all duration-300 overflow-hidden"
            >
              <summary className="flex cursor-pointer items-center justify-between px-8 py-6 text-left font-bold text-lg text-card-foreground hover:text-primary transition-colors list-none">
                <span className="pr-8">{faq.question}</span>
                <ChevronDown className="w-6 h-6 text-primary flex-shrink-0 transition-transform group-open:rotate-180 duration-300" />
              </summary>
              <div className="px-8 pb-6">
                <div className="pt-2 pb-4 text-muted-foreground leading-relaxed text-lg border-t border-border/50">
                  {faq.answer}
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
