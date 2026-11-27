import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Research blog",
  description:
    "Cost audits and practical notes for e-commerce support teams comparing helpdesk pricing models.",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    type: "website",
    url: "/blog",
    title: "Research blog | SupportMargin",
    description:
      "Cost audits and practical notes for e-commerce support teams comparing helpdesk pricing models.",
    siteName: "SupportMargin",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Research blog | SupportMargin",
    description:
      "Cost audits and practical notes for e-commerce support teams.",
  },
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <article className="py-16 sm:py-20">
      <header className="max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
          Research / Blog
        </p>
        <h1 className="mt-5 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
          Research blog
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted">
          Cost audits, pricing-mechanism notes and practical comparisons for
          small e-commerce support teams.
        </p>
      </header>

      <section className="mt-14 grid gap-6" aria-labelledby="published-articles">
        <h2 id="published-articles" className="sr-only">
          Published articles
        </h2>
        {posts.map((post) => (
          <article key={post.slug} className="border-b border-line pb-8">
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted">
              {post.publishedAt} · {post.tags.join(" / ")}
            </p>
            <h2 className="mt-3 font-serif text-2xl tracking-tight sm:text-3xl">
              <Link
                href={`/blog/${post.slug}`}
                className="hover:text-accent"
              >
                {post.title}
              </Link>
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
              {post.description}
            </p>
            <p className="mt-4 max-w-3xl border-l-2 border-accent pl-4 text-sm leading-7">
              {post.answerCapsule}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-14 border border-line p-6">
        <h2 className="font-serif text-xl">Run your own numbers</h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
          The{" "}
          <Link
            href="/gorgias-cost-calculator"
            className="text-accent underline decoration-line underline-offset-4 hover:decoration-accent"
          >
            Gorgias cost calculator
          </Link>{" "}
          lets you test ticket volume, AI resolution rate, seats and billing
          cycle against the same modeled pricing mechanics.
        </p>
        <Link
          href="/gorgias-cost-calculator"
          className="mt-4 inline-flex border border-accent px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-accent hover:bg-highlight"
        >
          Open calculator →
        </Link>
      </section>
    </article>
  );
}
