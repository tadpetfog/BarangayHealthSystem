import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { Reveal } from "./Reveal.jsx";

const faqs = [
  {
    question: "Is CareTech really free for residents?",
    answer:
      "Yes. CareTech is completely free for all barangay residents. There are no hidden fees for booking appointments or accessing your health records.",
  },
  {
    question: "How do I book an appointment?",
    answer:
      "Create an account, choose the service you need, and pick a date and time that works for you. Your barangay health worker will confirm the visit.",
  },
  {
    question: "Are my health records kept private?",
    answer:
      "Your records are stored securely and only accessible to you and authorized barangay health staff. We take your privacy seriously.",
  },
  {
    question: "Who can use CareTech?",
    answer:
      "CareTech is built for barangay residents, barangay health workers, and health center staff who want a simpler way to manage community healthcare.",
  },
];

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-slate-100 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
        aria-expanded={open}
      >
        <span className="font-heading text-base font-semibold text-navy">{question}</span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
          {open ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </span>
      </button>
      {open && <p className="px-6 pb-5 text-sm leading-relaxed text-body">{answer}</p>}
    </div>
  );
}

export function FaqSection() {
  return (
    <section id="contact" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-navy sm:text-4xl">Frequently asked questions</h2>
          <p className="mt-3 text-body">
            Everything you need to know about using CareTech in your barangay.
          </p>
        </Reveal>

        <div className="mt-12 grid items-center gap-12 lg:grid-cols-[1.4fr_1fr]">
          <Reveal className="flex flex-col gap-4">
            {faqs.map((faq) => (
              <FaqItem key={faq.question} {...faq} />
            ))}
          </Reveal>

          <Reveal delay={120} className="hidden justify-center lg:flex">
            <img
              src="https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&w=800&h=800&q=80&crop=faces"
              alt="A health worker answering a resident's questions at the health center"
              className="h-auto w-full max-w-sm object-contain"
              loading="lazy"
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
