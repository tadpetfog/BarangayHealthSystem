import { CalendarDays, ClipboardList, Users, CheckCircle2, ShieldCheck } from "lucide-react";
import { Reveal } from "./Reveal.jsx";

const reasons = [
  {
    icon: CalendarDays,
    title: "Simple Scheduling",
    description: "Book and manage check-ups online in just a few taps.",
  },
  {
    icon: ClipboardList,
    title: "Digital Records",
    description: "Keep resident health records organized and secure.",
  },
  {
    icon: Users,
    title: "Community Focused",
    description: "Built for residents, BHWs, and health center staff.",
  },
  {
    icon: CheckCircle2,
    title: "Free to Use",
    description: "No cost for barangay residents, always.",
  },
  {
    icon: ShieldCheck,
    title: "Trusted Support",
    description: "Reliable help whenever your community needs it.",
  },
];

export function ReasonsSection() {
  return (
    <section id="services" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-navy sm:text-4xl">
            5 reasons to choose CareTech
          </h2>
          <p className="mt-3 text-body">
            A warm, dependable platform designed to make barangay healthcare easier for everyone.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {reasons.map((reason, i) => (
            <Reveal
              key={reason.title}
              delay={i * 80}
              className="group rounded-xl border border-slate-100 bg-white p-6 text-center shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-transform duration-200 hover:-translate-y-1"
            >
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-brand-blue/20 text-brand-blue transition-colors group-hover:border-brand-blue">
                <reason.icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="mt-5 font-heading text-base font-semibold text-navy">
                {reason.title}
              </h3>
              <p className="mt-2 text-sm text-body">{reason.description}</p>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-12 text-center">
          <a
            href="#about"
            className="inline-flex rounded-full bg-brand-green px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-green-dark"
          >
            Explore CareTech
          </a>
        </Reveal>
      </div>
    </section>
  );
}
