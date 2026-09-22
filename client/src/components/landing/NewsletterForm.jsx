import { ArrowRight } from "lucide-react";

export function NewsletterForm() {
  return (
    <form className="mt-5 flex max-w-xs items-center gap-2" onSubmit={(e) => e.preventDefault()}>
      <label htmlFor="newsletter" className="sr-only">
        Email address
      </label>
      <input
        id="newsletter"
        type="email"
        placeholder="Your email"
        className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-brand-green focus:outline-none"
      />
      <button
        type="submit"
        aria-label="Subscribe to newsletter"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-green text-white transition-colors hover:bg-brand-green-dark"
      >
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </form>
  );
}
