import { Users, ClipboardList, HeartPulse, Check } from "lucide-react";
import { Reveal } from "./Reveal.jsx";

const audiences = [
  {
    icon: Users,
    role: "Barangay Residents",
    description: "Book free check-ups and keep your own health information up to date.",
    points: [
      "Book appointments online",
      "Track your appointments",
      "Manage your patient profile",
    ],
  },
  {
    icon: ClipboardList,
    role: "Barangay Health Workers",
    description: "Keep resident records organized and follow up on every visit.",
    points: [
      "Manage patient records",
      "Approve or cancel appointments",
      "Record consultations",
    ],
  },
  {
    icon: HeartPulse,
    role: "Health Center Staff",
    description: "Keep services available and appointments moving at the health center.",
    points: [
      "Maintain health services",
      "Track appointments",
      "View patient records",
    ],
  },
];

export function TestimonialsSection() {
  return (
    <section className="bg-white pb-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-navy sm:text-4xl">Who uses CareTech</h2>
          <p className="mt-3 text-body">
            Three roles, one platform — residents, barangay health workers, and health
            center staff.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {audiences.map((audience, i) => (
            <Reveal
              key={audience.role}
              delay={i * 100}
              className="rounded-xl border border-slate-100 bg-surface p-8 shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green">
                <audience.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="mt-5 font-heading text-lg font-semibold text-navy">
                {audience.role}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-body">
                {audience.description}
              </p>
              <ul className="mt-5 space-y-2.5">
                {audience.points.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm text-navy">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}