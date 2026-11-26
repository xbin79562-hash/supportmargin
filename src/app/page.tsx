import type { ReactNode } from "react";
import Link from "next/link";
import {
  AFFILIATE_FALLBACK_HREF,
  affiliateLinks,
  getAffiliateUrl,
  type AffiliateKey,
} from "@/config/affiliates";

const pageSections = [
  { id: "scope", number: "01", label: "Scope" },
  { id: "framework", number: "02", label: "Framework" },
  { id: "directory", number: "03", label: "Tool directory" },
  { id: "method", number: "04", label: "Method" },
];

const scopeNotes = [
  {
    title: "Channel structure",
    body: "Which support channels appear in public vendor documentation and how they are described.",
  },
  {
    title: "Tooling and seats",
    body: "How products are packaged, and which packaging terms are used for comparison.",
  },
  {
    title: "Cost categories",
    body: "The categories used to group support spend, recorded without estimates or totals.",
  },
  {
    title: "Reporting practices",
    body: "Which metrics vendors say they report, and how those descriptions are worded.",
  },
];

const frameworkRows = [
  {
    area: "Channel coverage",
    detail: "Channels listed in public documentation, recorded without estimates.",
    status: "Draft definition",
  },
  {
    area: "Support workflow",
    detail: "Ticket routing and escalation descriptions as published by vendors.",
    status: "Draft definition",
  },
  {
    area: "Automation",
    detail: "Chatbot and macro capabilities described in vendor materials.",
    status: "Draft definition",
  },
  {
    area: "Cost categories",
    detail: "Pricing dimensions used for comparison, listed without figures.",
    status: "Draft definition",
  },
];

const directory: { key: AffiliateKey; category: string; note: string }[] = [
  {
    key: "livechat",
    category: "Live chat",
    note: "Vendor page and product information.",
  },
  {
    key: "chatbot",
    category: "Automated messaging",
    note: "Vendor page and product information.",
  },
  {
    key: "helpdesk",
    category: "Helpdesk",
    note: "Vendor page and product information.",
  },
  {
    key: "text",
    category: "Messaging",
    note: "Vendor page and product information.",
  },
  {
    key: "smartsupp",
    category: "Live chat",
    note: "Vendor page and product information.",
  },
  {
    key: "zipchat",
    category: "AI assistant",
    note: "No registry URL has been supplied yet.",
  },
];

function SectionHeading({
  number,
  id,
  title,
}: {
  number: string;
  id: string;
  title: string;
}) {
  return (
    <div className="flex items-baseline gap-4 border-b border-line pb-4">
      <span className="font-mono text-xs text-muted">{number}</span>
      <h2
        id={id}
        className="scroll-mt-8 font-serif text-2xl tracking-tight sm:text-3xl"
      >
        {title}
      </h2>
    </div>
  );
}

function VendorLink({
  affiliateKey,
  children,
}: {
  affiliateKey: AffiliateKey;
  children: ReactNode;
}) {
  const href = getAffiliateUrl(affiliateKey);

  if (href === AFFILIATE_FALLBACK_HREF) {
    return (
      <span className="text-xs uppercase tracking-[0.12em] text-muted">
        Link pending
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="sponsored nofollow noopener"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-accent underline decoration-line underline-offset-4 hover:decoration-accent"
    >
      {children}
      <span aria-hidden="true">↗</span>
    </a>
  );
}

export default function Home() {
  return (
    <>
      <section className="border-b border-line py-16 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_13rem]">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
              Independent research notes
            </p>
            <h1 className="mt-6 max-w-3xl font-serif text-4xl leading-[1.08] tracking-tight sm:text-6xl">
              E-commerce support costs, examined in the open.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-muted">
              SupportMargin documents how online retailers organize support
              work, choose tools, and describe their costs. This site is a
              working editorial draft: conclusions are published only after
              review.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-3 text-xs uppercase tracking-[0.14em] text-muted">
              <span>Working draft</span>
              <span aria-hidden="true">·</span>
              <span>Tool-stack notes</span>
              <span aria-hidden="true">·</span>
              <span>Helpdesk benchmarks</span>
            </div>
          </div>

          <aside className="lg:sticky lg:top-8 lg:self-start">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">
              On this page
            </p>
            <nav aria-label="Sections" className="mt-4 flex flex-col gap-2.5">
              {pageSections.map((section) => (
                <Link
                  key={section.id}
                  href={`#${section.id}`}
                  className="text-sm text-muted hover:text-accent"
                >
                  <span className="mr-2 font-mono text-xs">{section.number}</span>
                  {section.label}
                </Link>
              ))}
            </nav>
            <div className="mt-8 border-t border-line pt-5 text-xs leading-5 text-muted">
              <p>
                Corrections and source tips are welcome through the{" "}
                <Link href="/contact" className="underline underline-offset-4">
                  contact page
                </Link>
                .
              </p>
            </div>
            <div className="mt-6 border-t border-line pt-5">
              <Link
                href="/gorgias-cost-calculator"
                className="text-sm font-medium text-accent underline decoration-line underline-offset-4 hover:decoration-accent"
              >
                Gorgias cost calculator →
              </Link>
              <p className="mt-1 text-xs leading-5 text-muted">
                Model ticket overages and AI per-resolution charges.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section id="scope" className="scroll-mt-8 py-16 sm:py-20">
        <SectionHeading number="01" id="scope-heading" title="Scope" />
        <div className="mt-10 grid gap-x-12 gap-y-8 sm:grid-cols-2">
          {scopeNotes.map((note) => (
            <div key={note.title} className="border-t border-line pt-5">
              <h3 className="font-serif text-lg">{note.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{note.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="framework" className="scroll-mt-8 py-16 sm:py-20">
        <SectionHeading number="02" id="framework-heading" title="Framework" />
        <p className="mt-6 max-w-2xl text-sm leading-7 text-muted">
          The framework defines what a comparison would record. All entries are
          currently structural definitions; no results are published.
        </p>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted">
                <th className="py-3 pr-6 font-medium">Area</th>
                <th className="py-3 pr-6 font-medium">What is recorded</th>
                <th className="py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {frameworkRows.map((row) => (
                <tr key={row.area} className="border-b border-line align-top">
                  <td className="py-4 pr-6 font-medium">{row.area}</td>
                  <td className="py-4 pr-6 leading-6 text-muted">{row.detail}</td>
                  <td className="py-4 text-xs uppercase tracking-[0.1em] text-muted">
                    {row.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-6 text-sm text-muted">
          Want to test the assumptions? Open the{" "}
          <Link
            href="/gorgias-cost-calculator"
            className="text-accent underline decoration-line underline-offset-4 hover:decoration-accent"
          >
            Gorgias cost calculator
          </Link>
          .
        </p>
      </section>

      <section id="directory" className="scroll-mt-8 py-16 sm:py-20">
        <SectionHeading number="03" id="directory-heading" title="Tool directory" />
        <p className="mt-6 max-w-2xl text-sm leading-7 text-muted">
          These entries collect public vendor pages for reference. Some links
          are affiliate links; see the{" "}
          <Link
            href="/affiliate-disclosure"
            className="underline decoration-line underline-offset-4 hover:text-accent"
          >
            affiliate disclosure
          </Link>
          .
        </p>
        <div className="mt-8 divide-y divide-line border-y border-line">
          {directory.map((entry, index) => (
            <article
              key={entry.key}
              className="grid gap-2 py-5 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:items-baseline sm:gap-4"
            >
              <span className="font-mono text-xs text-muted">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="font-serif text-lg">
                  {affiliateLinks[entry.key].label}
                </h3>
                <p className="mt-1 text-sm leading-6 text-muted">
                  {entry.category} — {entry.note}
                </p>
              </div>
              <VendorLink affiliateKey={entry.key}>Visit site</VendorLink>
            </article>
          ))}
        </div>
        <p className="mt-5 text-xs leading-5 text-muted">
          An entry without a registry URL appears as “Link pending” and is not
          linked.
        </p>
      </section>

      <section id="method" className="scroll-mt-8 py-16 sm:py-20">
        <SectionHeading number="04" id="method-heading" title="Method and notes" />
        <div className="mt-10 grid gap-10 sm:grid-cols-2">
          <div>
            <h3 className="font-serif text-xl">Editorial process</h3>
            <p className="mt-3 text-sm leading-7 text-muted">
              Draft placeholder. Source criteria, review steps, and update dates
              will be added here after review.
            </p>
          </div>
          <div>
            <h3 className="font-serif text-xl">Corrections</h3>
            <p className="mt-3 text-sm leading-7 text-muted">
              Draft placeholder. Send corrections through the{" "}
              <Link href="/contact" className="underline underline-offset-4">
                contact page
              </Link>
              ; changes will be noted on the page they affect.
            </p>
          </div>
        </div>
        <p className="mt-12 border-t border-line pt-6 text-xs leading-6 text-muted">
          This site is in draft. No benchmark figures or cost estimates have
          been published yet.
        </p>
      </section>
    </>
  );
}
