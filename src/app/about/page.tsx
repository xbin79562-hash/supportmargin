import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "About SupportMargin: independent e-commerce support cost audits and helpdesk evaluation.",
};

export default function AboutPage() {
  return (
    <article className="py-16 sm:py-20">
      <header className="max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
          About
        </p>
        <h1 className="mt-5 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
          About SupportMargin
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted">
          An independent editorial site focused on e-commerce support cost
          audits, ticket and AI resolution pricing mechanics, and lean helpdesk
          alternatives.
        </p>
      </header>

      <div className="mt-14 grid gap-10 border-t border-line pt-10 md:grid-cols-[12rem_minmax(0,1fr)]">
        <aside className="text-xs leading-6 text-muted">
          <p className="uppercase tracking-[0.14em]">On this page</p>
          <p className="mt-3">
            <Link
              href="/gorgias-cost-calculator"
              className="underline underline-offset-4"
            >
              Cost calculator
            </Link>
          </p>
          <p className="mt-3">
            <Link href="/contact" className="underline underline-offset-4">
              Contact the editor
            </Link>
          </p>
        </aside>

        <div className="space-y-12">
          <section>
            <h2 className="font-serif text-2xl tracking-tight">Our focus</h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              We examine how online retailers structure support work and how
              vendors describe the costs of that work: ticket volumes and
              allowances, overage charges, AI resolution fees, seat pricing and
              the mechanics that make those charges stack. We also document
              lean helpdesk setups as an alternative to larger suites.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">
              How we evaluate
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              Comparison starts with published vendor documentation and a
              stated set of assumptions. We describe the structure of a pricing
              model before drawing conclusions, and we keep the inputs visible
              so readers can test their own scenario rather than inherit ours.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">
              Modeled estimators and live quotes
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              A modeled estimator applies adjustable assumptions to show how
              charges could stack in a given scenario. It is not a quote: it
              does not reflect negotiated contracts, account-specific terms or
              current promotions. A live quote from a vendor is the
              authoritative price for a specific account, and readers should
              verify it directly on the vendor&apos;s website.
            </p>
            <p className="mt-4 text-sm leading-7 text-muted">
              Our{" "}
              <Link
                href="/gorgias-cost-calculator"
                className="underline underline-offset-4"
              >
                Gorgias cost calculator
              </Link>{" "}
              follows this approach. Every figure is derived from inputs you
              can change, including the AI fee per resolution.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">
              Commercial relationships
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              Some outbound links are affiliate links. They do not change our
              evaluation approach or modeled assumptions. The full policy is
              on the{" "}
              <Link
                href="/affiliate-disclosure"
                className="underline underline-offset-4"
              >
                affiliate disclosure
              </Link>{" "}
              page.
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
