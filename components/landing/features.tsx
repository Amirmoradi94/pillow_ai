import { Clock, MessageSquare, BarChart3, Settings, Mic2, Rocket } from "lucide-react";

const features = [
  {
    icon: Clock,
    title: "24/7 Availability",
    description: "Never miss a call. Your AI agent handles customer inquiries around the clock, even on holidays.",
    gradient: "gradient-primary",
    size: "large",
  },
  {
    icon: MessageSquare,
    title: "Natural Conversations",
    description: "Human-like dialogue that understands context, handles interruptions, and responds naturally.",
    gradient: "gradient-secondary",
    size: "medium",
  },
  {
    icon: BarChart3,
    title: "Call Analytics",
    description: "Detailed insights into call patterns, customer sentiment, and conversion metrics.",
    gradient: "gradient-primary",
    size: "medium",
  },
  {
    icon: Settings,
    title: "Easy Customization",
    description: "Tailor your agent's personality, knowledge base, and responses to match your brand.",
    gradient: "gradient-secondary",
    size: "medium",
  },
  {
    icon: Mic2,
    title: "Voice Recording",
    description: "Clone your voice or choose from premium AI voices to represent your business.",
    gradient: "gradient-primary",
    size: "medium",
  },
  {
    icon: Rocket,
    title: "Quick Setup",
    description: "Go live in minutes with our simple onboarding process. No coding required.",
    gradient: "gradient-secondary",
    size: "large",
  },
];

export function Features() {
  return (
    <section id="features" className="relative py-24 md:py-32 overflow-hidden">
      {/* Enhanced Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      <div className="absolute inset-0 gradient-mesh opacity-40" />

      {/* Decorative elements */}
      <div className="absolute top-20 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-3xl animate-float-delayed" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header - Left aligned for modern feel */}
        <div className="max-w-2xl mb-20">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm font-semibold text-primary mb-6 tracking-wider uppercase shadow-soft">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Features
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-foreground leading-tight">
            Everything you need to{" "}
            <span className="relative inline-block">
              <span className="text-gradient">automate calls</span>
              <div className="absolute inset-0 blur-xl bg-gradient-to-r from-primary/30 to-secondary/30 -z-10" />
            </span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            Powerful features designed specifically for small and local businesses
            to deliver exceptional customer service.
          </p>
        </div>

        {/* Enhanced Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Large card - spans 7 columns */}
          <div className="lg:col-span-7 group">
            <div className="h-full p-10 lg:p-12 rounded-3xl glass-card hover:shadow-elevated transition-all duration-500 relative overflow-hidden">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-500" />
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative z-10">
                <div className="w-20 h-20 rounded-2xl gradient-primary shadow-glow flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                  <Clock className="w-10 h-10 text-primary-foreground" />
                </div>
                <h3 className="text-3xl lg:text-4xl font-bold mb-5 text-card-foreground">{features[0].title}</h3>
                <p className="text-muted-foreground text-lg leading-relaxed max-w-md mb-10">{features[0].description}</p>

                {/* Enhanced decorative stats */}
                <div className="flex gap-10">
                  <div className="glass-strong px-6 py-4 rounded-2xl">
                    <div className="text-4xl font-bold text-gradient mb-1">99.9%</div>
                    <div className="text-sm text-muted-foreground">Uptime</div>
                  </div>
                  <div className="glass-strong px-6 py-4 rounded-2xl">
                    <div className="text-4xl font-bold text-gradient-secondary mb-1">24/7</div>
                    <div className="text-sm text-muted-foreground">Support</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Medium card - spans 5 columns */}
          <div className="lg:col-span-5 group">
            <div className="h-full p-8 lg:p-10 rounded-3xl glass-card hover:shadow-elevated transition-all duration-500 relative overflow-hidden">
              <div className="absolute -right-16 -bottom-16 w-56 h-56 bg-secondary/10 rounded-full blur-3xl group-hover:bg-secondary/20 transition-all duration-500" />
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative z-10">
                <div className="w-16 h-16 rounded-xl gradient-secondary shadow-glow-secondary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <MessageSquare className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-card-foreground">{features[1].title}</h3>
                <p className="text-muted-foreground leading-relaxed">{features[1].description}</p>
              </div>
            </div>
          </div>

          {/* Three equal cards */}
          {[features[2], features[3], features[4]].map((feature, index) => (
            <div key={feature.title} className="lg:col-span-4 group">
              <div className="h-full p-8 rounded-3xl glass-card hover:shadow-elevated transition-all duration-500 relative overflow-hidden">
                <div className={`absolute -right-12 -bottom-12 w-48 h-48 ${index % 2 === 0 ? 'bg-primary/8' : 'bg-secondary/8'} rounded-full blur-3xl group-hover:opacity-100 opacity-0 transition-all duration-500`} />

                <div className="relative z-10">
                  <div className={`w-14 h-14 rounded-xl ${feature.gradient} ${index % 2 === 0 ? 'shadow-glow' : 'shadow-glow-secondary'} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-card-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Wide bottom card with premium design */}
          <div className="lg:col-span-12 group relative overflow-hidden rounded-3xl">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500" />

            <div className="relative p-10 lg:p-12">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
                <div className="flex items-center gap-8">
                  <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Rocket className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold mb-2 text-white">{features[5].title}</h3>
                    <p className="text-white/90 max-w-lg text-lg">{features[5].description}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="px-8 py-4 bg-white/20 backdrop-blur-xl rounded-2xl text-white font-semibold text-lg shadow-lg">
                    5 min setup
                  </div>
                  <div className="px-8 py-4 bg-white/20 backdrop-blur-xl rounded-2xl text-white font-semibold text-lg shadow-lg">
                    No code
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
