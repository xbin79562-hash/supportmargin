import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/json-ld";
import {
  getAllPostSlugs,
  getPostBySlug,
  renderMarkdown,
} from "@/lib/blog";

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

const siteUrl = "https://supportmargin.com";

export function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return { title: "Article not found" };
  }

  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      type: "article",
      url: `/blog/${post.slug}`,
      title: post.title,
      description: post.description,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [siteUrl],
      siteName: "SupportMargin",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) notFound();

  const articleUrl = `${siteUrl}/blog/${post.slug}`;

  const techArticleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "@id": `${articleUrl}#article`,
    headline: post.title,
    description: post.description,
    url: articleUrl,
    mainEntityOfPage: articleUrl,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: {
      "@type": "Organization",
      name: "SupportMargin",
      url: siteUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "SupportMargin",
      url: siteUrl,
    },
    inLanguage: "en",
    keywords: post.tags.join(", "),
    articleSection: "E-commerce support cost audits",
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
        name: "Blog",
        item: `${siteUrl}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: articleUrl,
      },
    ],
  };

  return (
    <article className="py-16 sm:py-20">
      <JsonLd data={techArticleSchema} />
      <JsonLd data={breadcrumbSchema} />

      <header className="max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
          Research / {post.tags[0]}
        </p>
        <h1 className="mt-5 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
          {post.title}
        </h1>
        <p className="mt-5 text-sm text-muted">
          Published {post.publishedAt} · Updated {post.updatedAt}
        </p>
        <p className="mt-6 text-lg leading-8 text-muted">{post.description}</p>
      </header>

      <section className="mt-10 max-w-3xl border-l-2 border-accent pl-5" aria-label="Answer capsule">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
          Short answer
        </p>
        <p className="mt-2 text-base leading-8">{post.answerCapsule}</p>
      </section>

      <aside className="mt-10 max-w-3xl border border-line bg-highlight/40 p-5">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
          Hub-and-spoke link
        </p>
        <p className="mt-2 text-sm leading-7">
          Want to test the same assumptions with your own volume? Open the{" "}
          <Link
            href="/gorgias-cost-calculator"
            className="text-accent underline decoration-line underline-offset-4 hover:decoration-accent"
          >
            Gorgias cost calculator
          </Link>
          .
        </p>
      </aside>

      <div
        className="mt-12 max-w-3xl space-y-5 text-sm leading-7 text-muted [&_a]:text-accent [&_a]:underline [&_a]:decoration-line [&_a]:underline-offset-4 [&_blockquote]:mt-5 [&_blockquote]:border-l-2 [&_blockquote]:border-accent [&_blockquote]:pl-5 [&_code]:font-mono [&_h2]:mt-10 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:tracking-tight [&_h2]:text-ink [&_h3]:mt-8 [&_h3]:font-serif [&_h3]:text-xl [&_h3]:text-ink [&_li]:mt-2 [&_p]:mt-4 [&_strong]:text-ink [&_table]:mt-6 [&_table]:w-full [&_table]:border-collapse [&_td]:border-b [&_td]:border-line [&_td]:py-3 [&_td]:pr-4 [&_td]:align-top [&_th]:border-b [&_th]:border-line [&_th]:py-3 [&_th]:pr-4 [&_th]:text-left [&_th]:font-medium [&_th]:text-ink [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
      />

      <section className="mt-16 max-w-3xl border-t border-line pt-8" aria-labelledby="continue-audit">
        <h2 id="continue-audit" className="font-serif text-2xl tracking-tight">
          Continue the audit
        </h2>
        <p className="mt-3 text-sm leading-7 text-muted">
          Use the calculator to replace these modeled examples with your own
          ticket volume, AI resolution rate, seat count and billing cycle.
        </p>
        <Link
          href="/gorgias-cost-calculator"
          className="mt-5 inline-flex border border-accent px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-accent hover:bg-highlight"
        >
          Open calculator →
        </Link>
        <div className="mt-6">
          <Link
            href="/blog"
            className="text-sm text-muted underline decoration-line underline-offset-4 hover:text-accent"
          >
            Back to all research posts →
          </Link>
        </div>
      </section>
    </article>
  );
}
