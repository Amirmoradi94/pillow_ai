import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Mitchell",
    role: "Owner, Serenity Spa",
    content: "Pillow AI has been a game-changer for our spa. We never miss a booking request anymore, even when we're fully booked with clients. Our revenue increased by 35% in just 3 months!",
    rating: 5,
    avatar: "SM",
  },
  {
    name: "Dr. James Chen",
    role: "Director, Family Care Clinic",
    content: "The AI handles appointment scheduling and basic patient inquiries so efficiently. My staff can now focus on in-person patient care instead of being glued to the phone.",
    rating: 5,
    avatar: "JC",
  },
  {
    name: "Mike Rodriguez",
    role: "Owner, AutoPro Repairs",
    content: "I was skeptical at first, but the natural conversation flow amazed me. Customers don't even realize they're talking to an AI. It's like having a 24/7 receptionist.",
    rating: 5,
    avatar: "MR",
  },
  {
    name: "Lisa Thompson",
    role: "Manager, Bella Italian Restaurant",
    content: "During peak hours, we used to miss so many reservation calls. Now every call is answered instantly. Our no-show rate dropped by 50% thanks to the automated reminders!",
    rating: 5,
    avatar: "LT",
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="relative py-24 md:py-32 overflow-hidden">
      {/* Enhanced gradient background */}
      <div className="absolute inset-0 gradient-hero" />
      <div className="absolute inset-0 gradient-mesh opacity-40" />

      {/* Decorative orbs */}
      <div className="absolute top-1/4 left-10 w-[500px] h-[500px] bg-secondary/15 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-primary/15 rounded-full blur-3xl animate-float-delayed" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm font-semibold text-primary mb-6 shadow-soft">
            <Star className="w-3.5 h-3.5 fill-primary animate-pulse" />
            Testimonials
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-foreground">
            Loved by{" "}
            <span className="relative inline-block">
              <span className="text-gradient">business owners</span>
              <div className="absolute inset-0 blur-xl bg-gradient-to-r from-primary/30 to-secondary/30 -z-10" />
            </span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            See what our customers have to say about transforming their customer service with Pillow AI.
          </p>
        </div>

        {/* Enhanced testimonials grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.name}
              className="group relative"
            >
              <div className="h-full p-8 lg:p-10 rounded-3xl glass-card hover:shadow-elevated transition-all duration-500 relative overflow-hidden">
                {/* Quote decoration */}
                <Quote className="absolute top-6 right-6 w-16 h-16 text-primary/10 group-hover:text-primary/20 transition-colors duration-500" />

                {/* Animated background */}
                <div className={`absolute inset-0 ${index % 2 === 0 ? 'bg-gradient-to-br from-primary/5' : 'bg-gradient-to-br from-secondary/5'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                <div className="relative z-10">
                  {/* Stars */}
                  <div className="flex gap-1 mb-6">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <div key={i} className="w-6 h-6 rounded-full gradient-primary shadow-glow flex items-center justify-center">
                        <Star className="w-4 h-4 fill-primary-foreground text-primary-foreground" />
                      </div>
                    ))}
                  </div>

                  {/* Content */}
                  <p className="text-foreground text-lg leading-relaxed mb-8">
                    &ldquo;{testimonial.content}&rdquo;
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl gradient-primary shadow-glow flex items-center justify-center text-primary-foreground font-bold text-lg">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-lg">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
