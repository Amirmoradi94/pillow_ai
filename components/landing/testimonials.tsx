import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "Owner, Spark Electrical Services",
    content: "Pillow AI transformed our business. We went from missing 40% of calls to capturing every lead. The AI agent handles appointments flawlessly!",
    rating: 5,
  },
  {
    name: "Michael Chen",
    role: "Manager, Fix-It Plumbing",
    content: "The setup was incredibly fast. Within 2 hours, our AI agent was live and answering calls. Our customers can't tell they're talking to an AI.",
    rating: 5,
  },
  {
    name: "Emily Rodriguez",
    role: "Founder, Glow Beauty Studio",
    content: "We've reduced our front desk workload by 70%. The AI agent books appointments and answers questions 24/7. Absolutely game-changing.",
    rating: 5,
  },
];

export function Testimonials() {
  return (
    <section className="bg-muted/50 py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
            Trusted by Canadian Businesses
          </h2>
          <p className="text-lg text-muted-foreground">
            See what our customers have to say about Pillow AI.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.name}
              className="rounded-lg border bg-card p-6 shadow-sm"
            >
              <div className="mb-4 flex gap-1">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-5 w-5 fill-primary text-primary"
                  />
                ))}
              </div>
              <p className="mb-6 text-muted-foreground">&ldquo;{testimonial.content}&rdquo;</p>
              <div>
                <div className="font-semibold">{testimonial.name}</div>
                <div className="text-sm text-muted-foreground">{testimonial.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
