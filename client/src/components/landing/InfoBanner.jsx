import { ArrowRight } from "lucide-react";
import { Reveal } from "./Reveal.jsx";

export function InfoBanner() {
  return (
    <section id="about" className="bg-navy">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-20">
        <Reveal>
          <div className="overflow-hidden rounded-2xl">
            <img
              src="https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=800&h=800&q=80"
              alt="A caregiver gently holding the hand of an elderly resident"
              className="aspect-square h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </Reveal>

        <Reveal delay={120}>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-green">
            What is CareTech?
          </p>
          <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
            A friendly health platform for the whole barangay.
          </h2>
          <p className="mt-5 max-w-xl leading-relaxed text-white/75">
            CareTech brings appointment scheduling, patient records, and community health
            insights together in one place. It helps residents get the care they need and
            gives health workers the tools to serve their neighborhoods with confidence.
          </p>
          <a
            href="#how-it-works"
            className="mt-8 inline-flex items-center gap-2 rounded-lg border border-white/40 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-navy"
          >
            Learn More
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </Reveal>
      </div>
    </section>
  );
}
