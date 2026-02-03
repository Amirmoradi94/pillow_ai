import { Stethoscope, Car, UtensilsCrossed, Sparkles } from "lucide-react";

const industries = [
  {
    icon: Stethoscope,
    title: "Med Clinics",
    description: "Handle appointment scheduling, prescription refills, and patient inquiries with HIPAA-compliant AI.",
    stats: "85% call automation",
    gradient: "from-primary/20 to-primary/5",
  },
  {
    icon: Car,
    title: "Auto Repairs",
    description: "Book service appointments, provide estimates, and send maintenance reminders automatically.",
    stats: "3x more bookings",
    gradient: "from-secondary/20 to-secondary/5",
  },
  {
    icon: UtensilsCrossed,
    title: "Restaurants",
    description: "Take reservations, answer menu questions, and handle takeout orders seamlessly.",
    stats: "60% fewer missed calls",
    gradient: "from-primary/20 to-primary/5",
  },
  {
    icon: Sparkles,
    title: "Beauty & Spas",
    description: "Schedule appointments, manage waitlists, and send confirmations without lifting a finger.",
    stats: "40% revenue increase",
    gradient: "from-secondary/20 to-secondary/5",
  },
];

export function Industries() {
  return (
    <section id="industries" className="relative py-24 md:py-32 overflow-hidden">
      {/* Enhanced gradient background */}
      <div className="absolute inset-0 gradient-hero" />
      <div className="absolute inset-0 gradient-mesh opacity-50" />

      {/* Decorative elements */}
      <div className="absolute top-20 right-10 w-[400px] h-[400px] bg-primary/15 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-secondary/15 rounded-full blur-3xl animate-float-delayed" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm font-semibold text-primary mb-6 shadow-soft">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Industries
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-foreground">
            Built for{" "}
            <span className="relative inline-block">
              <span className="text-gradient">local businesses</span>
              <div className="absolute inset-0 blur-xl bg-gradient-to-r from-primary/30 to-secondary/30 -z-10" />
            </span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            Tailored solutions for the industries that need it most.
            Join thousands of businesses already transforming their customer experience.
          </p>
        </div>

        {/* Enhanced industries grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {industries.map((industry, index) => (
            <div
              key={industry.title}
              className="group relative"
            >
              <div className={`h-full p-10 rounded-3xl glass-card hover:shadow-elevated transition-all duration-500 relative overflow-hidden`}>
                {/* Animated background gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${industry.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className={`absolute -right-16 -bottom-16 w-64 h-64 ${index % 2 === 0 ? 'bg-primary/10' : 'bg-secondary/10'} rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-all duration-500`} />

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-6">
                    <div className={`w-16 h-16 rounded-xl glass-strong flex items-center justify-center ${index % 2 === 0 ? 'shadow-glow' : 'shadow-glow-secondary'} group-hover:scale-110 transition-transform duration-300`}>
                      <industry.icon className="w-8 h-8 text-primary" />
                    </div>
                    <div className="glass px-4 py-2 rounded-full shadow-soft">
                      <span className="text-sm font-bold text-gradient">{industry.stats}</span>
                    </div>
                  </div>
                  <h3 className="text-2xl lg:text-3xl font-bold mb-4 text-foreground">{industry.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-lg">{industry.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
