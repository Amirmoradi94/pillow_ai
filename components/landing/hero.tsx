import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Phone, Zap, Shield } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background">
      <div className="container mx-auto px-4 py-20 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <Zap className="mr-2 h-4 w-4" />
            AI-Powered Phone System for Canadian Businesses
          </div>
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Never Miss a Call Again with{" "}
            <span className="text-primary">Intelligent Voice Agents</span>
          </h1>
          <p className="mb-8 text-lg text-muted-foreground md:text-xl">
            Transform your business communication with AI-powered voice agents that handle
            appointments, answer questions, and capture leads 24/7. Perfect for electricians,
            plumbers, renovators, and beauty specialists.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link href="/auth/signup">
              <Button size="lg" className="text-base">
                <Phone className="mr-2 h-5 w-5" />
                Get Started Free
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-base">
              Watch Demo
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              14-Day Free Trial
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              No Credit Card Required
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Cancel Anytime
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
