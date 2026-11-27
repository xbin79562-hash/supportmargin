import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/json-ld";
import "./globals.css";

const siteUrl = "https://supportmargin.com";
const siteTitle = "SupportMargin — Independent e-commerce support research";
const siteDescription =
  "Working editorial notes on e-commerce support costs and lean helpdesk setups.";

export const metadata: Metadata = {
  title: {
    default: siteTitle,
    template: "%s | SupportMargin",
  },
  description: siteDescription,
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "SupportMargin",
    url: siteUrl,
    title: siteTitle,
    description: siteDescription,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${siteUrl}/#organization`,
  name: "SupportMargin",
  url: siteUrl,
  description: siteDescription,
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${siteUrl}/#website`,
  url: siteUrl,
  name: "SupportMargin",
  description: siteDescription,
  publisher: { "@id": `${siteUrl}/#organization` },
  inLanguage: "en",
};

const navItems = [
  { href: "/", label: "Research" },
  { href: "/gorgias-cost-calculator", label: "Cost calculator" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
  { href: "/affiliate-disclosure", label: "Affiliate Disclosure" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/contact", label: "Contact" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full font-sans antialiased">
        <JsonLd data={organizationSchema} />
        <JsonLd data={websiteSchema} />
        <div className="mx-auto flex min-h-full w-full max-w-[1180px] flex-col px-5 sm:px-8">
          <header className="border-b border-line">
            <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-4 py-6">
              <Link
                href="/"
                className="font-serif text-xl tracking-tight hover:text-accent"
              >
                SupportMargin<span className="text-accent">.</span>
              </Link>
              <nav
                aria-label="Primary navigation"
                className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted"
              >
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="hover:text-ink"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
            <p className="border-t border-line py-3 text-xs leading-relaxed text-muted">
              <span className="mr-2 font-medium uppercase tracking-[0.14em] text-ink">
                Disclosure
              </span>
              Some outgoing links are affiliate links. Read the{" "}
              <Link
                href="/affiliate-disclosure"
                className="underline decoration-line underline-offset-4 hover:text-accent"
              >
                affiliate disclosure
              </Link>
              .
            </p>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="mt-24 border-t border-line py-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-serif text-lg">SupportMargin</p>
                <p className="mt-1 max-w-sm text-sm leading-6 text-muted">
                  Independent notes on e-commerce support costs and lean
                  helpdesk setups.
                </p>
              </div>
              <nav
                aria-label="Footer navigation"
                className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted"
              >
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="hover:text-ink"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
            <p className="mt-8 border-t border-line pt-5 text-xs text-muted">
              Editorial draft. Affiliate relationships are described on the
              disclosure page.
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
