import { useState } from "react";
import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, HeartPulse, Menu, X } from "lucide-react";

const navLinks = [
  { label: "Home", href: "#home" },
  { label: "Services", href: "#services" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

function Logo() {
  return (
    <a href="#home" className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-green text-white">
        <HeartPulse className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="font-heading text-xl font-bold text-navy">CareTech</span>
    </a>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header id="home">
      {}
      <div className="bg-navy text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-2 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-1.5">
            <a href="tel:+639123456789" className="flex items-center gap-2 text-white/85 transition-colors hover:text-white">
              <Phone className="h-3.5 w-3.5 shrink-0 text-brand-green" aria-hidden="true" />
              +63 912 345 6789
            </a>
            <a href="mailto:info@caretech.ph" className="flex items-center gap-2 text-white/85 transition-colors hover:text-white">
              <Mail className="h-3.5 w-3.5 shrink-0 text-brand-green" aria-hidden="true" />
              info@caretech.ph
            </a>
            <span className="flex items-center gap-2 text-white/85">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-green" aria-hidden="true" />
              Barangay Health Center, Balic-Balic, Sampaloc, Manila
            </span>
          </div>
          <div className="flex items-center gap-3 sm:shrink-0">
            <Link to="/login" className="text-white/85 transition-colors hover:text-white">
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded-md bg-brand-green px-3 py-1 font-medium text-white transition-colors hover:bg-brand-green-dark"
            >
              Register
            </Link>
          </div>
        </div>
      </div>

      {}
      <div className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <Logo />

          <ul className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="text-sm font-medium text-body transition-colors hover:text-brand-blue"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-navy md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </nav>

        {open && (
          <div className="border-t border-slate-200 bg-white md:hidden">
            <ul className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 sm:px-6">
              {navLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-md px-2 py-2 text-sm font-medium text-body transition-colors hover:bg-surface hover:text-brand-blue"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </header>
  );
}
