import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Twitter, Linkedin, Youtube, Github, Heart } from "lucide-react";
import logoPillow from "@/app/assets/logo_pillow.png";

const footerLinks = {
  product: [
    { name: "Features", href: "#features" },
    { name: "Pricing", href: "#pricing" },
    { name: "Integrations", href: "#" },
    { name: "API Docs", href: "#" },
  ],
  company: [
    { name: "About", href: "#" },
    { name: "Blog", href: "#" },
    { name: "Careers", href: "#" },
    { name: "Press", href: "#" },
  ],
  resources: [
    { name: "Help Center", href: "#" },
    { name: "Contact", href: "#contact" },
    { name: "Status", href: "#" },
    { name: "Security", href: "#" },
  ],
  legal: [
    { name: "Privacy", href: "#" },
    { name: "Terms", href: "#" },
    { name: "Cookies", href: "#" },
    { name: "GDPR", href: "#" },
  ],
};

const socialLinks = [
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Youtube, href: "#", label: "YouTube" },
  { icon: Github, href: "#", label: "GitHub" },
];

export function Footer() {
  return (
    <footer className="relative py-20 md:py-24 overflow-hidden">
      {/* Enhanced background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background to-primary/5" />
      <div className="absolute inset-0 gradient-mesh opacity-20" />

      {/* Top border with gradient */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10 lg:gap-16 mb-16">
          {/* Brand column */}
          <div className="col-span-2">
            <a href="#" className="flex items-center gap-3 mb-6 group">
              <Image
                src={logoPillow}
                alt="Pillow AI"
                className="h-12 w-auto object-contain group-hover:scale-110 transition-transform duration-300"
                priority
              />
            </a>
            <p className="text-muted-foreground mb-8 max-w-xs leading-relaxed text-lg">
              The most realistic AI voice agents for small and local businesses. Transform your customer service today.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-12 h-12 rounded-xl glass-strong hover:shadow-card flex items-center justify-center text-muted-foreground hover:text-primary transition-all duration-300 group"
                >
                  <social.icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </a>
              ))}
            </div>
          </div>

          {/* Links columns */}
          <div>
            <h4 className="font-bold text-foreground mb-6 text-lg">Product</h4>
            <ul className="space-y-4">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  <a href={link.href} className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-foreground mb-6 text-lg">Company</h4>
            <ul className="space-y-4">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <a href={link.href} className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-foreground mb-6 text-lg">Resources</h4>
            <ul className="space-y-4">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <a href={link.href} className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-foreground mb-6 text-lg">Legal</h4>
            <ul className="space-y-4">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <a href={link.href} className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-10 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-muted-foreground text-lg">
            &copy; {new Date().getFullYear()} Pillow AI. All rights reserved.
          </p>
          <p className="text-muted-foreground flex items-center gap-2 text-lg">
            Made with <Heart className="w-5 h-5 text-primary fill-primary animate-pulse" /> for small businesses everywhere
          </p>
        </div>
      </div>
    </footer>
  );
}
