import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Reveal } from "./Reveal.jsx";

const steps = [
  {
    image:
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=400&h=400&q=80",
    title: "Create your account",
    description: "Sign up as a resident in a few simple steps — no paperwork needed.",
  },
  {
    image:
      "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=400&h=400&q=80",
    title: "Book your visit",
    description: "Choose a convenient date and time for your free barangay check-up.",
  },
  {
    image:
      "https://images.unsplash.com/photo-1638202993928-7267aad84c31?auto=format&fit=crop&w=400&h=400&q=80",
    title: "Get cared for",
    description: "Visit the health center where your BHW is ready to welcome you.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-navy sm:text-4xl">How it works</h2>
          <p className="mt-3 text-body">
            Getting quality barangay healthcare is easy — just three friendly steps.
          </p>
        </Reveal>

        <div className="mt-14 grid items-start gap-8 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
          {steps.map((step, i) => (
            <div key={step.title} className="contents">
              <Reveal
                delay={i * 120}
                className="flex flex-col items-center text-center"
              >
                <div className="flex h-40 w-40 items-center justify-center rounded-2xl bg-surface p-4">
                  <img
                    src={step.image}
                    alt=""
                    className="h-full w-full object-contain"
                    loading="lazy"
                  />
                </div>
                <span className="mt-5 flex h-7 w-7 items-center justify-center rounded-full bg-brand-green text-sm font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-3 font-heading text-lg font-semibold text-navy">
                  {step.title}
                </h3>
                <p className="mt-2 max-w-xs text-sm text-body">{step.description}</p>
              </Reveal>

              {i < steps.length - 1 && (
                <div className="hidden items-center justify-center pt-16 lg:flex">
                  <ArrowRight className="h-7 w-7 text-brand-blue/40" aria-hidden="true" />
                </div>
              )}
            </div>
          ))}
        </div>

        <Reveal className="mt-14 text-center">
          <Link
            to="/register"
            className="inline-flex rounded-full bg-brand-green px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-green-dark"
          >
            Get Started
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
