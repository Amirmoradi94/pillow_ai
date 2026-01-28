'use client';

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ContactForm() {
  const router = useRouter();
  return (
    <section className="bg-primary py-20 text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
            Ready to Transform Your Business Calls?
          </h2>
          <p className="mb-8 text-lg text-primary-foreground/90">
            Start your free 14-day trial today. No credit card required.
          </p>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            router.push('/auth/signup');
          }}>
            <div className="grid gap-4 md:grid-cols-2">
              <input
                type="text"
                placeholder="Your Name"
                className="w-full rounded-lg border-0 px-4 py-3 text-foreground focus:ring-2 focus:ring-primary-foreground/50"
                required
              />
              <input
                type="email"
                placeholder="Email Address"
                className="w-full rounded-lg border-0 px-4 py-3 text-foreground focus:ring-2 focus:ring-primary-foreground/50"
                required
              />
            </div>
            <input
              type="text"
              placeholder="Company Name"
              className="w-full rounded-lg border-0 px-4 py-3 text-foreground focus:ring-2 focus:ring-primary-foreground/50"
            />
            <select className="w-full rounded-lg border-0 px-4 py-3 text-foreground focus:ring-2 focus:ring-primary-foreground/50">
              <option value="">Select Your Industry</option>
              <option value="electrician">Electrician</option>
              <option value="plumber">Plumber</option>
              <option value="renovator">Renovator</option>
              <option value="beauty">Beauty Specialist</option>
              <option value="hvac">HVAC</option>
              <option value="automotive">Automotive</option>
              <option value="dental">Dental Practice</option>
              <option value="other">Other</option>
            </select>
            <Button
              type="submit"
              size="lg"
              className="w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90"
            >
              Get Started Free
            </Button>
          </form>
          <p className="mt-4 text-sm text-primary-foreground/80">
            By signing up, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </section>
  );
}
