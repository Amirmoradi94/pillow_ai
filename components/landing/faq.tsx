import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "How does Pillow AI work?",
    answer:
      "Pillow AI integrates with your business phone system and uses advanced AI technology to handle incoming calls naturally. You customize your agent's voice, personality, and script, and it answers calls 24/7, just like a human receptionist.",
  },
  {
    question: "Can customers tell they're talking to an AI?",
    answer:
      "Our AI voice agents use cutting-edge technology that creates natural, human-like conversations. Most customers can't distinguish between our AI and a human agent, especially with proper script customization.",
  },
  {
    question: "How long does setup take?",
    answer:
      "Most businesses get their AI voice agent live in under 30 minutes. Our guided onboarding process walks you through selecting your voice, customizing your script, and connecting your phone number.",
  },
  {
    question: "What industries work best with Pillow AI?",
    answer:
      "Pillow AI is perfect for any service-based business that receives phone calls: electricians, plumbers, renovators, beauty specialists, HVAC technicians, automotive services, dental practices, and more.",
  },
  {
    question: "Can I customize the AI agent's personality?",
    answer:
      "Absolutely! You can choose from multiple voice options, set the tone (professional, friendly, casual), and write custom scripts that match your brand's personality. You can update these at any time.",
  },
  {
    question: "What happens if the AI can't handle a call?",
    answer:
      "You can configure fallback options: transfer to a human agent, send a follow-up SMS, or collect a callback request. The AI can also identify complex issues and flag them for human follow-up.",
  },
  {
    question: "Do I need to sign a contract?",
    answer:
      "No! All plans are month-to-month with no long-term commitments. Start with our 14-day free trial and cancel anytime if it's not the right fit for your business.",
  },
];

export function FAQ() {
  return (
    <section className="bg-background py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to know about Pillow AI.
            </p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <details
                key={index}
                className="group rounded-lg border bg-card transition-all"
              >
                <summary className="flex cursor-pointer items-center justify-between p-6 font-semibold transition-colors hover:bg-muted/50">
                  {faq.question}
                  <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-6 pb-6 text-muted-foreground">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
