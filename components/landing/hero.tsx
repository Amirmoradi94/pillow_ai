"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Mic, ArrowRight, Sparkles, Zap, Check } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* Enhanced Background with Mesh Gradient */}
      <div className="absolute inset-0 gradient-hero">
        <div className="absolute inset-0 gradient-mesh opacity-60" />
      </div>

      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/20 rounded-full blur-3xl animate-float opacity-60" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-secondary/20 rounded-full blur-3xl animate-float-delayed opacity-50"
             style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 rounded-full blur-3xl animate-spin-slow" />
      </div>

      {/* Premium Glass Navigation */}
      <nav className="relative z-50 mx-4 mt-4 md:mx-8 md:mt-6">
        <div className="glass-strong rounded-2xl px-6 py-4 md:px-8 shadow-elevated">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-glow">
                <Mic className="h-5 w-5 text-primary-foreground" />
                <div className="absolute inset-0 rounded-xl bg-white/20 blur-sm" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Pillow AI</span>
            </div>

            <div className="hidden items-center gap-8 md:flex">
              <a href="#features" className="text-sm font-medium text-muted-foreground transition-all hover:text-primary hover:scale-105">Features</a>
              <a href="#industries" className="text-sm font-medium text-muted-foreground transition-all hover:text-primary hover:scale-105">Industries</a>
              <a href="#pricing" className="text-sm font-medium text-muted-foreground transition-all hover:text-primary hover:scale-105">Pricing</a>
              <a href="#testimonials" className="text-sm font-medium text-muted-foreground transition-all hover:text-primary hover:scale-105">Testimonials</a>
              <a href="#faq" className="text-sm font-medium text-muted-foreground transition-all hover:text-primary hover:scale-105">FAQ</a>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/auth/signin">
                <Button variant="ghost" className="text-sm font-medium hover:bg-white/10">
                  Login
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button variant="hero" size="sm" className="shadow-glow">
                  Start Free Trial
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
        <div className="text-center max-w-5xl mx-auto">
          {/* Premium Badge with Glass Effect */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass-strong mb-8 animate-fade-in-up shadow-soft shimmer">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-sm font-semibold text-foreground">AI-Powered Voice Technology</span>
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          </div>

          {/* Main heading with Enhanced Typography */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold tracking-tight mb-8 animate-fade-in-up leading-tight" style={{ animationDelay: "0.1s" }}>
            Create the most realistic{" "}
            <span className="relative inline-block">
              <span className="text-gradient relative z-10">AI voice agents</span>
              <div className="absolute inset-0 blur-2xl bg-gradient-to-r from-primary/50 to-secondary/50 -z-10 animate-pulse" />
            </span>
          </h1>

          {/* Enhanced Subheading */}
          <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            Transform your business communication with AI-powered voice agents that handle
            appointments, answer questions, and capture leads 24/7.
          </p>

          {/* Premium CTA Section */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <Link href="/auth/signup">
              <Button variant="hero" size="xl" className="shadow-glow hover:shadow-[0_0_60px_rgba(139,92,246,0.6)] hover:scale-105 transition-all duration-300 group">
                <span>Start 14-Day Free Trial</span>
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="#demo">
              <Button variant="glass" size="xl" className="shadow-card hover:shadow-elevated transition-all duration-300">
                <Zap className="w-5 h-5 mr-2" />
                <span>Watch Demo</span>
              </Button>
            </Link>
          </div>

          {/* Trust Indicators with Premium Glass Cards */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full glass shadow-soft">
              <Check className="w-4 h-4 text-primary" />
              <span className="text-foreground font-medium">50 minutes included</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full glass shadow-soft">
              <Check className="w-4 h-4 text-primary" />
              <span className="text-foreground font-medium">No credit card required</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full glass shadow-soft">
              <Check className="w-4 h-4 text-primary" />
              <span className="text-foreground font-medium">Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
