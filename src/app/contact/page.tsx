import type { Metadata } from "next";
import Link from "next/link";
import CopyEmailButton from "@/components/copy-email-button";

export const metadata: Metadata = {
  title: "Contact",
  description: "Editorial feedback, cost-model corrections and partnership enquiries for SupportMargin.",
};

const editorialEmail = "editor@supportmargin.com";

export default function ContactPage() {
  return (
    <article className="py-16 sm:py-20">
      <header className="max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
          Contact
        </p>
        <h1 className="mt-5 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
          Editorial and partnership contact
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted">
          Use the address below for editorial feedback, corrections to our cost
          models, and partnership enquiries.
        </p>
      </header>

      <div className="mt-12 max-w-3xl border-y border-line py-8">
        <p className="text-xs uppercase tracking-[0.14em] text-muted">
          Editorial email
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-4">
          <a
            href={`mailto:${editorialEmail}`}
            className="inline-block break-all font-serif text-2xl text-accent underline decoration-line underline-offset-4 hover:decoration-accent sm:text-3xl"
          >
            {editorialEmail}
          </a>
          <CopyEmailButton email={editorialEmail} />
        </div>
        <p className="mt-4 text-xs leading-6 text-muted">
          The link opens your email client. The button copies the address to
          your clipboard.
        </p>
      </div>

      <div className="mt-14 grid gap-10 md:grid-cols-3">
        <section className="border-t border-line pt-5">
          <h2 className="font-serif text-lg">Editorial feedback</h2>
          <p className="mt-2 text-sm leading-7 text-muted">
            Comments on published notes, source suggestions, and topics you
            would like us to examine. Include the page URL when relevant.
          </p>
        </section>
        <section className="border-t border-line pt-5">
          <h2 className="font-serif text-lg">Cost-model corrections</h2>
          <p className="mt-2 text-sm leading-7 text-muted">
            Corrections to assumptions or pricing mechanics in our estimators.
            Please cite public vendor documentation and identify the specific
            input or formula.
          </p>
        </section>
        <section className="border-t border-line pt-5">
          <h2 className="font-serif text-lg">Partnership inquiries</h2>
          <p className="mt-2 text-sm leading-7 text-muted">
            Questions about affiliate links or commercial relationships. Our
            policy is described on the{" "}
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

      <p className="mt-12 text-xs leading-6 text-muted">
        For questions about how this site handles information, see the{" "}
        <Link href="/privacy-policy" className="underline underline-offset-4">
          privacy policy
        </Link>
        .
      </p>
    </article>
  );
}
