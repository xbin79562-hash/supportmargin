import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Affiliate disclosure",
  description: "How affiliate links and commercial relationships work on SupportMargin.",
};

export default function AffiliateDisclosurePage() {
  return (
    <article className="py-16 sm:py-20">
      <header className="max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
          Policy
        </p>
        <h1 className="mt-5 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
          Affiliate disclosure
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted">
          SupportMargin publishes independent evaluation of e-commerce support
          costs and helpdesk tools. Some outbound links on this site are
          affiliate links.
        </p>
      </header>

      <div className="mt-8 max-w-3xl border-l-2 border-accent bg-highlight/40 px-5 py-4 text-sm leading-7">
        In short: if you click an affiliate link and then sign up or purchase,
        SupportMargin may earn a commission at no extra cost to you.
      </div>

      <div className="mt-14 grid gap-10 border-t border-line pt-10 md:grid-cols-[12rem_minmax(0,1fr)]">
        <aside className="text-xs leading-6 text-muted">
          <p className="uppercase tracking-[0.14em]">On this page</p>
          <p className="mt-3">
            <Link href="/contact" className="underline underline-offset-4">
              Questions about this policy
            </Link>
          </p>
          <p className="mt-3">
            <Link href="/privacy-policy" className="underline underline-offset-4">
              Privacy policy
            </Link>
          </p>
        </aside>

        <div className="space-y-12">
          <section>
            <h2 className="font-serif text-2xl tracking-tight">
              How affiliate links work
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              When you follow an affiliate link and later sign up or purchase
              from that vendor, SupportMargin may receive a commission from the
              vendor. The payment does not add to the price you pay. We do not
              publish commission rates or earnings figures on this site.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">
              Editorial independence
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              Commercial relationships do not alter our comparison methodology
              or the modeled cost assumptions used in estimators such as the{" "}
              <Link
                href="/gorgias-cost-calculator"
                className="underline underline-offset-4"
              >
                Gorgias cost calculator
              </Link>
              . Assumptions are shown so readers can inspect and change them.
              Corrections can be sent through the contact page.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">
              Attribution and tracking
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              Partner URLs may contain query parameters used to attribute a
              referral. SupportMargin can append an optional sub_id value
              through its centralized link configuration while preserving the
              vendor&apos;s existing parameters. The destination site may also set
              cookies under its own privacy policy.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">
              Verify before you decide
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              Pricing, plan limits and contract terms change. Verify live
              pricing and terms directly on each vendor&apos;s website before
              making a decision. Figures in our estimators are modeled
              assumptions, not vendor quotes.
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
