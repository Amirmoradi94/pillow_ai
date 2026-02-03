"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Phone, Mail, MapPin, Send } from "lucide-react";

export function ContactForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push('/auth/signup');
  };

  return (
    <section id="contact" className="relative py-24 md:py-32 overflow-hidden">
      {/* Enhanced gradient background */}
      <div className="absolute inset-0 gradient-hero" />
      <div className="absolute inset-0 gradient-mesh opacity-50" />

      {/* Decorative orbs */}
      <div className="absolute top-1/4 left-10 w-[500px] h-[500px] bg-primary/15 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-secondary/15 rounded-full blur-3xl animate-float-delayed" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 max-w-7xl mx-auto">
          {/* Left side - CTA content */}
          <div className="flex flex-col justify-center">
            <span className="inline-flex items-center gap-2 w-fit px-4 py-1.5 rounded-full glass text-sm font-semibold text-primary mb-6 shadow-soft">
              <Send className="w-3.5 h-3.5" />
              Get Started
            </span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-foreground leading-tight">
              Ready to transform your{" "}
              <span className="relative inline-block">
                <span className="text-gradient">customer service?</span>
                <div className="absolute inset-0 blur-xl bg-gradient-to-r from-primary/30 to-secondary/30 -z-10" />
              </span>
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed">
              Start your 14-day free trial today. No credit card required.
              See why thousands of businesses trust Pillow AI.
            </p>

            {/* Enhanced contact info cards */}
            <div className="space-y-4">
              {[
                { icon: Phone, label: "Call us", value: "(555) 123-4567" },
                { icon: Mail, label: "Email us", value: "hello@pillowai.com" },
                { icon: MapPin, label: "Visit us", value: "San Francisco, CA" },
              ].map((contact, index) => (
                <div key={contact.label} className="flex items-center gap-4 p-4 rounded-2xl glass-card hover:shadow-card transition-all duration-300 group">
                  <div className={`w-14 h-14 rounded-xl ${index % 2 === 0 ? 'gradient-primary shadow-glow' : 'gradient-secondary shadow-glow-secondary'} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <contact.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{contact.label}</p>
                    <p className="font-bold text-foreground text-lg">{contact.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right side - Enhanced Form */}
          <div className="relative">
            <div className="glass-strong p-10 rounded-3xl shadow-elevated relative overflow-hidden">
              {/* Decorative gradient */}
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
              <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-secondary/10 rounded-full blur-3xl" />

              <div className="relative z-10">
                <h3 className="text-3xl font-bold text-foreground mb-3">Start your free trial</h3>
                <p className="text-muted-foreground mb-8 text-lg">Fill out the form and we'll get you set up in minutes.</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Input
                      type="text"
                      placeholder="Your name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="h-14 glass-strong border-white/20 text-lg px-6 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="h-14 glass-strong border-white/20 text-lg px-6 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <Input
                      type="tel"
                      placeholder="Phone number"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="h-14 glass-strong border-white/20 text-lg px-6 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Tell us about your business..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="min-h-[140px] glass-strong border-white/20 text-lg px-6 py-4 resize-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <Button variant="hero" size="lg" className="w-full h-14 text-lg shadow-glow hover:shadow-[0_0_100px_hsl(280_70%_55%/0.5)] transition-all duration-300 group">
                    <span>Start Free Trial</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <p className="text-xs text-center text-muted-foreground pt-2">
                    By signing up, you agree to our Terms of Service and Privacy Policy.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
