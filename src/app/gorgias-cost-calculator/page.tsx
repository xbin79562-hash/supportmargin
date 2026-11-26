import type { Metadata } from "next";
import Link from "next/link";
import GorgiasCostCalculator from "@/components/gorgias-cost-calculator";

export const metadata: Metadata = {
  title: "Gorgias cost calculator",
  description:
    "An editable, illustrative model of ticket overages and AI per-resolution charges for e-commerce support teams.",
};

export default function GorgiasCostCalculatorPage() {
  return (
    <article className="py-16 sm:py-20">
      <header className="max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
          Tools / Cost model
        </p>
        <h1 className="mt-5 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
          Gorgias cost calculator
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted">
          Adjust ticket volume, AI resolution rate, team size and billing cycle
          to see how ticket allowances, per-ticket overages and per-resolution
          AI charges stack in an illustrative model.
        </p>
      </header>

      <div className="mt-8 max-w-3xl border-y border-line bg-highlight/40 px-5 py-4 text-sm leading-7">
        <p>
          <span className="mr-2 font-medium uppercase tracking-[0.12em]">
            Affiliate disclosure
          </span>
          Some vendor links below are affiliate links. See the{" "}
          <Link
            href="/affiliate-disclosure"
            className="underline decoration-line underline-offset-4 hover:text-accent"
          >
            affiliate disclosure
          </Link>{" "}
          for details.
        </p>
        <p className="mt-2 text-muted">
          Verify live pricing on vendor site. All amounts shown are modeled
          estimates from editable assumptions, not verified quotes.
        </p>
      </div>

      <div className="mt-14">
        <GorgiasCostCalculator />
      </div>

      <p className="mt-14 border-t border-line pt-6 text-xs leading-6 text-muted">
        Method note: the model uses common public pricing mechanics as a
        structure for comparison. Figures are assumptions chosen for scenario
        testing and should be replaced with current vendor information before
        any decision.
      </p>
    </article>
  );
}
