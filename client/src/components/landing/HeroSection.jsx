import { Link } from "react-router-dom";
import { Check, ArrowRight } from "lucide-react";
import { Reveal } from "./Reveal.jsx";

const bullets = [
  { text: "Free for residents", color: "text-brand-green" },
  { text: "Book appointments online", color: "text-warm-orange" },
  { text: "Secure patient records", color: "text-brand-green" },
  { text: "Real-time analytics", color: "text-warm-orange" },
];

export function HeroSection() {
  return (
    <section className="bg-gradient-to-b from-blue-50/60 to-white">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-24">
        <Reveal>
          <p className="mb-4 inline-flex rounded-full bg-blue-50 px-4 py-1.5 text-sm font-medium text-brand-blue">
            Barangay Health, made simple
          </p>
          <h1 className="text-balance text-4xl font-bold text-ink sm:text-5xl lg:text-[3.4rem]">
            Say hello to better barangay healthcare.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-body">
            CareTech connects residents, barangay health workers, and health center staff
            in one warm, easy-to-use platform — from booking a check-up to keeping records
            safe.
          </p>

          <ul className="mt-8 grid max-w-md gap-3 sm:grid-cols-2">
            {bullets.map((b) => (
              <li key={b.text} className="flex items-center gap-2.5 text-sm font-medium text-navy">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full bg-current/10 ${b.color}`}>
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                {b.text}
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-green px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-green-dark"
            >
              Book Appointment
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a
              href="#services"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-blue transition-colors hover:text-navy"
            >
              Learn More
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="relative">
            <div className="overflow-hidden rounded-2xl shadow-[0_20px_50px_rgba(10,37,64,0.12)]">
              <img
                src="https://images.unsplash.com/photo-1581056771107-24ca5f033842?auto=format&fit=crop&w=900&h=900&q=80&crop=faces"
                alt="A nurse holding a clipboard while talking with a smiling patient at a community health center"
                className="h-full w-full object-cover"
                fetchPriority="high"
              />
            </div>
            <div className="absolute -bottom-5 -left-5 hidden rounded-xl bg-white px-5 py-4 shadow-[0_10px_30px_rgba(10,37,64,0.12)] sm:block">
              <p className="text-2xl font-bold text-navy">100%</p>
              <p className="text-xs text-body">Free for residents</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
