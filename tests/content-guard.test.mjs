import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  checkTopicOverlap,
  normalizeBlogDocument,
  runPricingFactGate,
  scanStalePosts,
} from "../scripts/lib/content-guard.mjs";
import { parseFrontmatter } from "../src/lib/blog.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function tempDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "supportmargin-content-guard-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function writeClaims(dir, claimsFile) {
  fs.writeFileSync(
    path.join(dir, "pricing-claims.json"),
    `${JSON.stringify(claimsFile, null, 2)}\n`,
    "utf8",
  );
}

const safeArticle =
  "modeled estimates based on public November 2026 pricing — verify live pricing on vendor site. Monthly totals are illustrative modeled estimates.";

test("Gate 3 passes when declared claims match the engine", async (t) => {
  const dir = tempDir(t);
  writeClaims(dir, {
    verifiedAt: "2026-11",
    scenario: { tickets: 1000, aiRate: 40, seats: 2, billing: "monthly" },
    assumptions: { gorgiasTier: "auto" },
    claims: [
      { id: "gorgias", field: "monthlyCost", expected: 740 },
      { id: "smartsupp", field: "monthlyCost", expected: 115 },
    ],
  });

  const result = await runPricingFactGate({
    root,
    approvedDir: dir,
    content: safeArticle,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.failures, []);
  assert.ok(result.checks.some((check) => check.name === "pricing-claims" && check.status === "pass"));
});

test("Gate 3 blocks tampered numbers and missing modeled labeling", async (t) => {
  const tamperedDir = tempDir(t);
  writeClaims(tamperedDir, {
    verifiedAt: "2026-11",
    scenario: { tickets: 1000, aiRate: 40, seats: 2, billing: "monthly" },
    claims: [{ id: "gorgias", field: "monthlyCost", expected: 999 }],
  });

  const tampered = await runPricingFactGate({
    root,
    approvedDir: tamperedDir,
    content: safeArticle,
  });
  assert.equal(tampered.ok, false);
  assert.ok(tampered.failures.some((message) => message.includes("gorgias.monthlyCost")));
  assert.ok(tampered.details.some((detail) => detail.claim === "gorgias.monthlyCost" && detail.delta > 1));

  const unlabeledDir = tempDir(t);
  const unlabeled = await runPricingFactGate({
    root,
    approvedDir: unlabeledDir,
    content: "Verify live pricing on vendor site. November 2026.",
  });
  assert.equal(unlabeled.ok, false);
  assert.ok(unlabeled.failures.some((message) => message.includes("modeled-label")));
});

test("topic overlap detection and stale article scan work", (t) => {
  const dir = tempDir(t);
  fs.mkdirSync(path.join(dir, "src/data"), { recursive: true });
  fs.copyFileSync(
    path.join(root, "src/data/pricing-catalog.json"),
    path.join(dir, "src/data/pricing-catalog.json"),
  );

  const log = {
    schemaVersion: 1,
    entries: [
      {
        slug: "gorgias-double-billing",
        title: "The Gorgias double-billing trap",
        keywords: ["ticket overages", "AI resolutions"],
        catalogSchemaVersion: 1,
        catalogVerifiedAt: "2026-10",
        channels: { blog: "published", x: "ready", reddit: "manual-copy" },
        lastGateStatus: "pass",
        updatedAt: "2026-10-01T00:00:00.000Z",
      },
      {
        slug: "pending-draft",
        title: "LiveChat workflow notes",
        keywords: ["agent workflow"],
        catalogSchemaVersion: 1,
        catalogVerifiedAt: "2026-09",
        channels: { blog: "pending", x: "pending", reddit: "pending" },
        lastGateStatus: "pass",
        updatedAt: "2026-09-01T00:00:00.000Z",
      },
    ],
  };

  const overlap = checkTopicOverlap(log, {
    title: "Gorgias double billing cost audit",
    keywords: ["ticket overages", "AI resolutions"],
  });
  assert.equal(overlap.hasOverlap, true);
  assert.equal(overlap.matches[0].slug, "gorgias-double-billing");

  const noOverlap = checkTopicOverlap(log, {
    title: "Zapier migration checklist",
    keywords: ["workflow automation"],
  });
  assert.equal(noOverlap.hasOverlap, false);

  const stale = scanStalePosts({ root: dir, log });
  assert.deepEqual(stale.map((entry) => entry.slug), ["gorgias-double-billing"]);
});

test("normalized blog document is parseable by src/lib/blog.ts", async (t) => {
  const dir = tempDir(t);
  const source = `# Test article title

A short paragraph for the answer capsule with enough words to satisfy the editorial handoff contract.

## Section

- one
- two
`;

  const normalized = await normalizeBlogDocument({
    root,
    slug: "test-article",
    source,
    overrides: {
      title: "Test article title",
      description: "A parseable test article.",
      answerCapsule:
        "A short paragraph for the answer capsule with enough words to satisfy the editorial handoff contract.",
      tags: ["Gorgias", "Testing"],
    },
  });

  const parsed = parseFrontmatter(normalized);
  assert.equal(parsed.data.slug, "test-article");
  assert.equal(parsed.data.title, "Test article title");
  assert.equal(parsed.data.description, "A parseable test article.");
  assert.deepEqual(parsed.data.tags, ["Gorgias", "Testing"]);
  assert.match(parsed.content, /<|\n/);
  assert.doesNotMatch(parsed.content, /^# Test article title/);
  assert.ok(dir);
});
