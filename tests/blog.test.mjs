import assert from "node:assert/strict";
import test from "node:test";

import {
  getAllPostSlugs,
  getPostBySlug,
  parseFrontmatter,
  renderMarkdown,
} from "../src/lib/blog.ts";

test("parseFrontmatter reads scalar, folded and list fields", () => {
  const raw = `---
slug: sample-post
title: "Sample post"
description: A test article
publishedAt: "2026-11-27"
updatedAt: "2026-11-27"
answerCapsule: >
  This is a folded answer capsule
  across multiple lines.
tags:
  - Gorgias
  - Cost modeling
---

## Body

Text.
`;

  const { data, content } = parseFrontmatter(raw);

  assert.equal(data.slug, "sample-post");
  assert.equal(data.title, "Sample post");
  assert.equal(
    data.answerCapsule,
    "This is a folded answer capsule across multiple lines.",
  );
  assert.deepEqual(data.tags, ["Gorgias", "Cost modeling"]);
  assert.match(content, /^## Body/);
});

test("published post slug matches distribute.mjs article URL rule", () => {
  const slugs = getAllPostSlugs();
  assert.ok(slugs.includes("001-gorgias-double-billing"));

  const post = getPostBySlug("001-gorgias-double-billing");
  assert.ok(post);
  assert.equal(post.slug, "001-gorgias-double-billing");
  assert.match(post.title, /double-billing/i);
  assert.match(post.answerCapsule, /modeled estimates/i);
});

test("renderMarkdown covers headings, lists, tables, quotes, bold and safe links", () => {
  const html = renderMarkdown(`## Heading

**Bold** and [vendor](https://example.com/?a=1&b=2).

- one
- two

> quoted text

| A | B |
|---|---|
| 1 | 2 |

[internal](/gorgias-cost-calculator)
`);

  assert.match(html, /<h2>Heading<\/h2>/);
  assert.match(html, /<strong>Bold<\/strong>/);
  assert.match(html, /href="https:\/\/example\.com\/\?a=1&amp;b=2"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="sponsored nofollow noopener"/);
  assert.match(html, /<ul>/);
  assert.match(html, /<li>one<\/li>/);
  assert.match(html, /<blockquote>quoted text<\/blockquote>/);
  assert.match(html, /<table>/);
  assert.match(html, /<th>A<\/th>/);
  assert.match(html, /<td>2<\/td>/);
  assert.match(html, /<a href="\/gorgias-cost-calculator">internal<\/a>/);
});
