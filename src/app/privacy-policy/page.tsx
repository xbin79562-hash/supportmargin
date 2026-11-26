import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "Plain-language privacy policy for the SupportMargin editorial site.",
};

const editorialEmail = "editor@supportmargin.com";

export default function PrivacyPolicyPage() {
  return (
    <article className="py-16 sm:py-20">
      <header className="max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
          Policy
        </p>
        <h1 className="mt-5 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
          Privacy policy
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted">
          SupportMargin is a lightweight editorial site. This page explains in
          plain language what information may be handled when you read a page
          or follow an outbound link.
        </p>
      </header>

      <div className="mt-14 grid gap-10 border-t border-line pt-10 md:grid-cols-[12rem_minmax(0,1fr)]">
        <aside className="text-xs leading-6 text-muted">
          <p className="uppercase tracking-[0.14em]">On this page</p>
          <p className="mt-3">
            <Link href="/contact" className="underline underline-offset-4">
              Privacy questions
            </Link>
          </p>
          <p className="mt-3">
            <Link href="/affiliate-disclosure" className="underline underline-offset-4">
              Affiliate disclosure
            </Link>
          </p>
        </aside>

        <div className="space-y-12">
          <section>
            <h2 className="font-serif text-2xl tracking-tight">Scope</h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              This policy covers the editorial pages and cost estimators on
              supportmargin.com. Reading the site does not require an account
              or a subscription. Vendor websites reached through our links have
              their own policies, which govern your use of those sites.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">
              Server and analytics logs
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              Like most websites, our hosting and any analytics we enable may
              record standard request information: IP address, browser and
              device type, pages requested, timestamps and the referring page.
              This is used to deliver the site and understand traffic. If
              analytics uses cookies or similar identifiers, you can block or
              delete them in your browser settings.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">
              Cookies and partner links
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              Some outbound vendor links are affiliate links. Their URLs may
              include referral parameters, and our link configuration can add
              an optional sub_id value while preserving the vendor&apos;s
              existing parameters. When you click through, the destination site
              may set cookies or record attribution under its own privacy
              policy. Details are in our{" "}
              <Link
                href="/affiliate-disclosure"
                className="underline underline-offset-4"
              >
                affiliate disclosure
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">
              Email correspondence
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              If you write to us, we use your message to reply and to keep a
              record of the enquiry. Please do not send sensitive personal data
              by email. Our editorial address is{" "}
              <a
                href={`mailto:${editorialEmail}`}
                className="text-accent underline decoration-line underline-offset-4"
              >
                {editorialEmail}
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">Your choices</h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              You can read the site without submitting personal details, block
              cookies in your browser, and choose not to follow outbound links.
              Cost calculators run from the inputs you enter and do not require
              an account.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl tracking-tight">Contact</h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              Privacy questions can be sent to {editorialEmail} or through the{" "}
              <Link href="/contact" className="underline underline-offset-4">
                contact page
              </Link>
              . We will update this policy if the site&apos;s data practices
              change.
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
