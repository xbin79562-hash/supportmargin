import type { Metadata } from "next";
import Link from "next/link";
import GorgiasCostCalculator from "@/components/gorgias-cost-calculator";
import JsonLd from "@/components/json-ld";
import pricingCatalog from "@/data/pricing-catalog.json";
import { getAllPosts } from "@/lib/blog";
import {
  computeScenario,
  getDefaultAssumptions,
  getDefaultInputs,
  PRICING_LABEL,
  type ComparisonKey,
  type ScenarioResult,
} from "@/lib/pricing/engine";

type BenchmarkKey = "gorgias" | ComparisonKey;

const catalog = pricingCatalog as unknown as typeof pricingCatalog;
const siteUrl = "https://supportmargin.com";
const calculatorUrl = `${siteUrl}/gorgias-cost-calculator`;
const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: catalog.currency,
  maximumFractionDigits: 0,
});

export const metadata: Metadata = {
  title: "Gorgias cost calculator",
  description:
    "An editable, illustrative model of ticket overages and AI per-resolution charges for e-commerce support teams.",
  alternates: {
    canonical: "/gorgias-cost-calculator",
  },
  openGraph: {
    type: "website",
    url: "/gorgias-cost-calculator",
    title: "Gorgias cost calculator | SupportMargin",
    description:
      "Model ticket overages, AI per-resolution charges and seat-based alternatives for e-commerce support teams.",
    siteName: "SupportMargin",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gorgias cost calculator | SupportMargin",
    description:
      "Model ticket overages, AI per-resolution charges and seat-based alternatives.",
  },
};

function comparisonMonthly(scenario: ScenarioResult, key: ComparisonKey) {
  return scenario.comparisons.find((comparison) => comparison.key === key)?.monthly ?? 0;
}

function benchmarkMonthly(scenario: ScenarioResult, key: BenchmarkKey) {
  return key === "gorgias" ? scenario.gorgias.monthly : comparisonMonthly(scenario, key);
}

export default function GorgiasCostCalculatorPage() {
  const inputs = getDefaultInputs();
  const assumptions = getDefaultAssumptions();
  const monthlyScenario = computeScenario(inputs, assumptions, "monthly");
  const annualScenario = computeScenario(inputs, assumptions, "annual");
  const firstPost = getAllPosts()[0];

  const answerCapsule = `At ${inputs.tickets.toLocaleString("en-US")} monthly tickets, ${inputs.aiRate}% AI resolution, ${inputs.seats} seats and monthly billing, our modeled Gorgias-style baseline is ${usd.format(monthlyScenario.gorgias.monthly)}, versus Smartsupp ${usd.format(comparisonMonthly(monthlyScenario, "smartsupp"))}, Text ${usd.format(comparisonMonthly(monthlyScenario, "text"))}, HelpDesk ${usd.format(comparisonMonthly(monthlyScenario, "helpdesk"))}, LiveChat ${usd.format(comparisonMonthly(monthlyScenario, "livechat"))} and Zipchat AI ${usd.format(comparisonMonthly(monthlyScenario, "zipchat"))}. Figures are illustrative modeled estimates verified ${catalog.verifiedAt}; verify live pricing on vendor sites.`;

  const benchmarkVolumes = [500, 1000, 3000];
  const benchmarkRows = benchmarkVolumes.map((tickets) => ({
    tickets,
    scenario: computeScenario(
      { ...inputs, tickets },
      assumptions,
      "monthly",
    ),
  }));

  const benchmarkProducts: Array<{
    key: BenchmarkKey;
    label: string;
    billingModel: string;
  }> = [
    {
      key: "gorgias",
      label: catalog.products.gorgias.name,
      billingModel: catalog.products.gorgias.billingModel,
    },
    {
      key: "smartsupp",
      label: catalog.products.smartsupp.name,
      billingModel: catalog.products.smartsupp.billingModel,
    },
    {
      key: "text",
      label: catalog.products.text.name,
      billingModel: catalog.products.text.billingModel,
    },
    {
      key: "helpdesk",
      label: catalog.products.helpdesk.name,
      billingModel: catalog.products.helpdesk.billingModel,
    },
    {
      key: "livechat",
      label: catalog.products.livechat.name,
      billingModel: catalog.products.livechat.billingModel,
    },
    {
      key: "zipchat",
      label: catalog.products.zipchat.name,
      billingModel: catalog.products.zipchat.billingModel,
    },
  ];

  const faqItems = [
    {
      question: "Why can a Gorgias bill rise twice during peak season?",
      answer:
        "Gorgias can bill the same AI-resolved conversation through the Helpdesk ticket meter and again through the AI Agent resolution meter. Our model adds ticket overages to per-resolution AI charges, then autoselects the cheapest eligible Helpdesk tier. Verify whether your live plan includes AI resolutions before comparing totals.",
    },
    {
      question: "When does a seat-based tool become easier to budget?",
      answer: `A seat-based tool usually becomes easier to budget when ticket volume swings but headcount stays stable. In our ${inputs.tickets.toLocaleString("en-US")}-ticket monthly example, Smartsupp models at ${usd.format(comparisonMonthly(monthlyScenario, "smartsupp"))} and LiveChat at ${usd.format(comparisonMonthly(monthlyScenario, "livechat"))}, versus a ${usd.format(monthlyScenario.gorgias.monthly)} Gorgias-style baseline. Treat those gaps as prompts to check features, not guaranteed savings.`,
    },
    {
      question: "What changes when I switch from monthly to annual billing?",
      answer: `The annual switch changes two things: per-month rates can be lower, and Gorgias tier selection can change because Starter is monthly-only. At ${inputs.tickets.toLocaleString("en-US")} tickets, our modeled baseline moves from ${usd.format(monthlyScenario.gorgias.monthly)} monthly-plan effective cost to ${usd.format(annualScenario.gorgias.monthly)} annual-plan effective cost. Check cancellation terms before committing.`,
    },
    {
      question: "How should I verify a live vendor quote against this model?",
      answer:
        "Open the vendor's live pricing page, confirm the exact plan name, included tickets or seats, AI resolution treatment, overage unit rate and annual billing terms. Then enter your own ticket volume and AI rate in the calculator. Compare the output with a written quote, not a marketing claim.",
    },
  ];

  const softwareApplicationSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${calculatorUrl}#software`,
    name: "SupportMargin Gorgias Cost Calculator",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: calculatorUrl,
    description:
      "Free online research calculator for modeling e-commerce support ticket overages, AI per-resolution charges and seat-based alternatives. Outputs are illustrative modeled estimates, not vendor quotes.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: catalog.currency,
    },
    publisher: {
      "@type": "Organization",
      name: "SupportMargin",
      url: siteUrl,
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${calculatorUrl}#faq`,
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Gorgias cost calculator",
        item: calculatorUrl,
      },
    ],
  };

  return (
    <article className="py-16 sm:py-20">
      <JsonLd data={softwareApplicationSchema} />
      <JsonLd data={faqSchema} />
      <JsonLd data={breadcrumbSchema} />

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

      <section className="mt-12 max-w-4xl" aria-labelledby="short-answer">
        <h2
          id="short-answer"
          className="font-serif text-2xl tracking-tight sm:text-3xl"
        >
          Short answer
        </h2>
        <p className="mt-4 border-l-2 border-accent pl-5 text-base leading-8 text-ink">
          {answerCapsule}
        </p>
        <p className="mt-3 text-xs leading-5 text-muted">{PRICING_LABEL}.</p>
      </section>

      <div className="mt-14">
        <GorgiasCostCalculator />
      </div>

      <section
        className="mt-16 border-t border-line pt-10"
        aria-labelledby="ssr-benchmark"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2
            id="ssr-benchmark"
            className="font-serif text-2xl tracking-tight sm:text-3xl"
          >
            SSR benchmark snapshot
          </h2>
          <p className="text-xs text-muted">No JavaScript required to read.</p>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-muted">
          {PRICING_LABEL}. Snapshot assumes {inputs.aiRate}% AI resolution,{" "}
          {inputs.seats} seats and monthly billing across three common
          e-commerce ticket volumes.
        </p>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted">
                <th className="py-3 pr-6 font-medium">Product</th>
                <th className="py-3 pr-6 font-medium">Billing model</th>
                {benchmarkVolumes.map((tickets) => (
                  <th key={tickets} className="py-3 pr-6 text-right font-medium">
                    {tickets.toLocaleString("en-US")} tickets
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {benchmarkProducts.map((product) => (
                <tr key={product.key} className="border-b border-line align-top">
                  <td className="py-4 pr-6 font-medium">{product.label}</td>
                  <td className="py-4 pr-6 font-mono text-xs text-muted">
                    {product.billingModel}
                  </td>
                  {benchmarkRows.map((row) => (
                    <td
                      key={`${product.key}-${row.tickets}`}
                      className="py-4 pr-6 text-right font-mono"
                    >
                      {usd.format(benchmarkMonthly(row.scenario, product.key))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-16 border-t border-line pt-10" aria-labelledby="faq">
        <h2
          id="faq"
          className="font-serif text-2xl tracking-tight sm:text-3xl"
        >
          Buyer FAQ
        </h2>
        <div className="mt-8 grid gap-8">
          {faqItems.map((item) => (
            <div key={item.question} className="border-b border-line pb-6">
              <h3 className="font-serif text-lg">{item.question}</h3>
              <p className="mt-3 text-sm leading-7 text-muted">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16 border-t border-line pt-10" aria-labelledby="research-links">
        <h2
          id="research-links"
          className="font-serif text-2xl tracking-tight sm:text-3xl"
        >
          Related research
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="border border-line p-5">
            <Link
              href="/blog"
              className="text-sm font-medium text-accent underline decoration-line underline-offset-4 hover:decoration-accent"
            >
              Browse the research blog →
            </Link>
            <p className="mt-2 text-xs leading-6 text-muted">
              Cost audits and practical notes for small e-commerce support teams.
            </p>
          </div>
          {firstPost ? (
            <div className="border border-line p-5">
              <Link
                href={`/blog/${firstPost.slug}`}
                className="text-sm font-medium text-accent underline decoration-line underline-offset-4 hover:decoration-accent"
              >
                {firstPost.title} →
              </Link>
              <p className="mt-2 text-xs leading-6 text-muted">
                {firstPost.answerCapsule}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <p className="mt-14 border-t border-line pt-6 text-xs leading-6 text-muted">
        Method note: the model uses common public pricing mechanics as a
        structure for comparison. Figures are assumptions chosen for scenario
        testing and should be replaced with current vendor information before
        any decision.
      </p>
    </article>
  );
}
