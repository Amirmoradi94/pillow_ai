import { Wrench, Droplets, Hammer, Sparkles, PhoneCall, Calendar } from "lucide-react";

const industries = [
  {
    icon: Wrench,
    title: "Electricians",
    description: "Handle service requests, schedule appointments, and answer technical questions 24/7.",
    color: "bg-blue-500/10 text-blue-600",
  },
  {
    icon: Droplets,
    title: "Plumbers",
    description: "Capture emergency calls, provide quotes, and book appointments without missing opportunities.",
    color: "bg-cyan-500/10 text-cyan-600",
  },
  {
    icon: Hammer,
    title: "Renovators",
    description: "Qualify leads, answer project inquiries, and schedule consultations automatically.",
    color: "bg-orange-500/10 text-orange-600",
  },
  {
    icon: Sparkles,
    title: "Beauty Specialists",
    description: "Book appointments, answer product questions, and manage customer inquiries effortlessly.",
    color: "bg-pink-500/10 text-pink-600",
  },
];

const stats = [
  { icon: PhoneCall, label: "Calls Handled", value: "10,000+" },
  { icon: Calendar, label: "Appointments Booked", value: "2,500+" },
  { icon: PhoneCall, label: "Average Response Time", value: "Under 3s" },
];

export function Industries() {
  return (
    <section className="bg-muted/50 py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
            Built for Canadian Service Businesses
          </h2>
          <p className="text-lg text-muted-foreground">
            Tailored solutions for industries where phone calls are critical to growth.
          </p>
        </div>
        <div className="mb-16 grid gap-6 md:grid-cols-2">
          {industries.map((industry) => (
            <div
              key={industry.title}
              className="rounded-lg border bg-card p-8 transition-all hover:shadow-lg"
            >
              <div className={`mb-4 inline-flex rounded-lg p-3 ${industry.color}`}>
                <industry.icon className="h-8 w-8" />
              </div>
              <h3 className="mb-2 text-2xl font-semibold">{industry.title}</h3>
              <p className="text-muted-foreground">{industry.description}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <stat.icon className="mx-auto mb-3 h-8 w-8 text-primary" />
              <div className="mb-1 text-3xl font-bold text-primary">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
