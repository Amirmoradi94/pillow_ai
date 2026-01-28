import { Clock, MessageSquare, BarChart3, Settings, Mic, Zap } from "lucide-react";

const features = [
  {
    icon: Clock,
    title: "24/7 Availability",
    description: "Your AI voice agent never sleeps. Capture every lead and answer every question, day or night.",
  },
  {
    icon: MessageSquare,
    title: "Natural Conversations",
    description: "Advanced AI technology ensures natural, human-like interactions that keep callers engaged.",
  },
  {
    icon: BarChart3,
    title: "Call Analytics",
    description: "Track call volumes, duration, transcripts, and customer insights in your dashboard.",
  },
  {
    icon: Settings,
    title: "Easy Customization",
    description: "Customize your agent's voice, personality, and script to match your brand perfectly.",
  },
  {
    icon: Mic,
    title: "Voice Recording",
    description: "Record and review every call for quality assurance and training purposes.",
  },
  {
    icon: Zap,
    title: "Quick Setup",
    description: "Get your AI voice agent live in under 30 minutes with our guided onboarding process.",
  },
];

export function Features() {
  return (
    <section className="bg-background py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
            Everything You Need to Automate Your Business Phone System
          </h2>
          <p className="text-lg text-muted-foreground">
            Powerful features designed to help local businesses scale without hiring more staff.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-lg border bg-card p-6 transition-all hover:shadow-lg"
            >
              <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
