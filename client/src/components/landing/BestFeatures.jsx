import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Reveal } from "./Reveal.jsx";

const features = [
  "Online appointment scheduling",
  "Secure digital patient records",
  "Appointment status tracking",
  "Barangay health analytics",
  "Health worker dashboards",
  "Resident profile management",
  "Health service & consultation management",
  "Services received records",
];

const stats = [
  { value: "Free", label: "For barangay residents" },
  { value: "3", label: "Steps to book a check-up" },
];

export function BestFeatures() {
  return (
    <section className="bg-surface py-20">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <Reveal>
          <span className="inline-flex rounded-full bg-brand-blue px-5 py-2 font-heading text-sm font-semibold text-white">
            Our best features
          </span>
          <p className="mt-6 max-w-md text-2xl font-bold leading-snug text-navy">
            Everything your barangay needs for warm, organized care.
          </p>

          <div className="mt-8 grid max-w-md grid-cols-2 gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-slate-100 bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
              >
                <p className="font-heading text-3xl font-bold text-brand-green">{stat.value}</p>
                <p className="mt-1 text-sm text-body">{stat.label}</p>
              </div>
            ))}
          </div>

          <p className="mt-6 max-w-md text-sm text-subtle">
            Trusted by health workers across the barangay to keep the community healthy and cared for.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
            <h3 className="font-heading text-xl font-bold text-navy">Full package included</h3>
            <p className="mt-1.5 text-sm text-body">Every feature, free for barangay residents.</p>

            <ul className="mt-6 grid gap-3.5 sm:grid-cols-2">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm text-navy">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            <Link
              to="/login"
              className="mt-8 inline-flex rounded-lg bg-brand-green px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-green-dark"
            >
              Book Appointment
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
