import { Link } from "react-router-dom";
import { HeartPulse, Phone, Mail, MapPin, Send, MessageCircle, Globe } from "lucide-react";
import { NewsletterForm } from "./NewsletterForm.jsx";

const planLinks = ["Digital Records", "Free Check-up", "Health Analytics", "Community Support"];
const socials = [
  { icon: MessageCircle, label: "Messenger" },
  { icon: Send, label: "Telegram" },
  { icon: Globe, label: "Website" },
];

export function SiteFooter() {
  return (
    <footer className="bg-[#081d33] text-white/75">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-3">
          {}
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-green text-white">
                <HeartPulse className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="font-heading text-xl font-bold text-white">CareTech</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed">
              A warm, community-focused platform helping barangays manage healthcare and
              scheduling with ease.
            </p>
            <div className="mt-5 space-y-2 text-sm">
              <a href="tel:+639123456789" className="flex items-center gap-2 transition-colors hover:text-white">
                <Phone className="h-4 w-4 text-brand-green" aria-hidden="true" />
                +63 912 345 6789
              </a>
              <a href="mailto:info@caretech.ph" className="flex items-center gap-2 transition-colors hover:text-white">
                <Mail className="h-4 w-4 text-brand-green" aria-hidden="true" />
                info@caretech.ph
              </a>
            </div>
          </div>

          {}
          <div>
            <h3 className="font-heading text-base font-semibold text-white">Our Plan</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link to="/login" className="transition-colors hover:text-white">
                  Book Appointment
                </Link>
              </li>
              {planLinks.map((link) => (
                <li key={link}>
                  <a href="#services" className="transition-colors hover:text-white">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {}
          <div>
            <h3 className="font-heading text-base font-semibold text-white">Contact Us</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-brand-green" aria-hidden="true" />
                +63 912 345 6789
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-brand-green" aria-hidden="true" />
                info@caretech.ph
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" aria-hidden="true" />
                Barangay Health Center, Balic-Balic, Sampaloc, Manila
              </li>
            </ul>

            <NewsletterForm />
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-sm text-white/60">
            © {new Date().getFullYear()} CareTech. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            {socials.map((social) => (
              <a
                key={social.label}
                href="#home"
                aria-label={social.label}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/70 transition-colors hover:bg-brand-green hover:text-white"
              >
                <social.icon className="h-4 w-4" aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
