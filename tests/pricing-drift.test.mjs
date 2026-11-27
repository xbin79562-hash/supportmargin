import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  REPORT_SCHEMA_VERSION,
  buildReport,
  classifySnapshot,
  parseArgs,
  renderMarkdown,
  writeReports,
} from "../scripts/check-pricing-drift.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function product(id, name, status, extra = {}) {
  return {
    id,
    name,
    pricingUrl: `https://www.${id}.example/pricing`,
    status,
    ...extra,
  };
}

test("classifySnapshot separates unchanged, drifted and baseline_unset", () => {
  const previous = { summaryHash: "aaa", visiblePrices: ["$60", "$740"] };
  const identical = { summaryHash: "aaa", visiblePrices: ["$60", "$740"] };

  assert.equal(classifySnapshot(previous, identical).status, "unchanged");

  const hashOnly = classifySnapshot(previous, {
    summaryHash: "bbb",
    visiblePrices: ["$60", "$740"],
  });
  assert.equal(hashOnly.status, "drifted");
  assert.deepEqual(hashOnly.reasons, ["page text summary hash changed"]);

  const priceOnly = classifySnapshot(previous, {
    summaryHash: "aaa",
    visiblePrices: ["$60", "$890"],
  });
  assert.equal(priceOnly.status, "drifted");
  assert.deepEqual(priceOnly.reasons, ["visible USD prices changed"]);

  const both = classifySnapshot(previous, {
    summaryHash: "bbb",
    visiblePrices: ["$890"],
  });
  assert.equal(both.status, "drifted");
  assert.equal(both.reasons.length, 2);

  assert.equal(
    classifySnapshot({ summaryHash: null, visiblePrices: [] }, identical).status,
    "baseline_unset",
  );
  assert.equal(classifySnapshot(undefined, identical).status, "baseline_unset");
});

test("buildReport keeps failed checks out of drifted and exposes required fields", () => {
  const results = [
    product("smartsupp", "Smartsupp", "unchanged"),
    product("text", "Text", "unchanged"),
    product("gorgias", "Gorgias", "drifted", {
      reasons: ["visible USD prices changed"],
      pricingUrl: "https://www.gorgias.com/pricing",
      baselinePrices: ["$60", "$740"],
      currentPrices: ["$60", "$890"],
      baselineHash: "aaa",
      currentHash: "bbb",
    }),
    product("zipchat", "Zipchat AI", "failed", {
      statusCode: 403,
      error: "HTTP 403 Forbidden",
      reason: "fetch/network error, not a price change",
    }),
    product("livechat", "LiveChat", "failed", {
      statusCode: null,
      error: "The operation was aborted due to timeout",
    }),
    product("helpdesk", "HelpDesk", "baseline_unset"),
  ];

  const report = buildReport({
    mode: "live",
    catalogVerifiedAt: "2026-11",
    results,
  });

  assert.equal(report.schemaVersion, REPORT_SCHEMA_VERSION);
  assert.equal(report.mode, "live");
  assert.equal(report.catalogVerifiedAt, "2026-11");
  assert.ok(report.generatedAt.endsWith("Z"));
  assert.deepEqual(report.counts, {
    unchanged: 2,
    drifted: 1,
    failed: 2,
    baselineUnset: 1,
    skipped: 0,
  });

  assert.equal(report.drifted.length, 1);
  assert.equal(report.drifted[0].pricingUrl, "https://www.gorgias.com/pricing");
  assert.deepEqual(report.drifted[0].baselinePrices, ["$60", "$740"]);
  assert.deepEqual(report.drifted[0].currentPrices, ["$60", "$890"]);

  assert.equal(report.failed.length, 2);
  assert.equal(report.failed[0].statusCode, 403);
  assert.ok(report.failed[0].error.includes("403"));
  assert.equal(report.failed[1].statusCode, null);
  assert.ok(report.failed[1].error.includes("timeout"));

  // A blocked/timeout page must never be reported as a price increase.
  assert.ok(!report.drifted.some((item) => item.status === "failed"));
  assert.ok(!report.drifted.some((item) => ["zipchat", "livechat"].includes(item.id)));

  const markdown = renderMarkdown(report);
  assert.ok(markdown.includes("NOT price changes"));
  assert.ok(markdown.includes("never misreported as a price increase"));
});

test("writeReports emits valid JSON and Markdown with the operator checklist", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "supportmargin-drift-"));
  try {
    const reportDir = path.join(tmp, "nested");
    const jsonPath = path.join(reportDir, "report.json");
    const mdPath = path.join(reportDir, "report.md");

    const results = [
      product("gorgias", "Gorgias", "drifted", {
        reasons: ["page text summary hash changed"],
        baselinePrices: ["$740"],
        currentPrices: ["$890"],
      }),
      product("zipchat", "Zipchat AI", "failed", {
        statusCode: 429,
        error: "HTTP 429 Too Many Requests",
      }),
      product("smartsupp", "Smartsupp", "unchanged"),
    ];
    const report = buildReport({
      mode: "live",
      catalogVerifiedAt: "2026-11",
      results,
    });

    const written = writeReports(report, {
      reportJson: jsonPath,
      reportMd: mdPath,
    });
    assert.equal(written.length, 2);
    assert.ok(fs.existsSync(jsonPath));
    assert.ok(fs.existsSync(mdPath));

    const json = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    assert.equal(json.drifted.length, 1);
    assert.equal(json.failed.length, 1);
    assert.equal(json.counts.unchanged, 1);
    assert.equal(json.mode, "live");

    const md = fs.readFileSync(mdPath, "utf8");
    assert.ok(md.startsWith("# SupportMargin Pricing Drift Report"));
    assert.ok(md.includes("## Drifted"));
    assert.ok(md.includes("## Failed"));
    assert.ok(md.includes("$740"));
    assert.ok(md.includes("$890"));
    assert.ok(md.includes("429"));
    assert.ok(md.includes("## Operator checklist"));
    assert.ok(md.includes("src/data/pricing-catalog.json"));
    assert.ok(md.includes("scripts/pricing-drift-baseline.json"));
    assert.ok(md.includes("--audit-stale"));
    assert.ok(md.indexOf("## Operator checklist") > md.indexOf("## Failed"));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("parseArgs keeps legacy flags and accepts the new report options", () => {
  const legacy = parseArgs(["--dry-run"]);
  assert.equal(legacy.dryRun, true);
  assert.equal(legacy.updateBaseline, false);
  assert.equal(legacy.failOnDrift, false);
  assert.equal(legacy.reportJson, null);
  assert.equal(legacy.reportMd, null);
  assert.deepEqual(legacy.unknownArgs, []);
  assert.deepEqual(legacy.errors, []);

  const full = parseArgs([
    "--update-baseline",
    "--fail-on-drift",
    "--report-json",
    "tmp/a.json",
    "--report-md=tmp/a.md",
  ]);
  assert.equal(full.updateBaseline, true);
  assert.equal(full.failOnDrift, true);
  assert.equal(full.reportJson, "tmp/a.json");
  assert.equal(full.reportMd, "tmp/a.md");
  assert.deepEqual(full.unknownArgs, []);

  assert.deepEqual(parseArgs(["--bogus"]).unknownArgs, ["--bogus"]);
  assert.ok(parseArgs(["--report-json"]).errors[0].includes("Missing value"));
});

test("ci.yml declares triggers, Node 22, least privilege and ordered steps", () => {
  const ci = readProjectFile(".github/workflows/ci.yml");
  for (const needle of [
    'branches: ["main", "feat/**", "refactor/**"]',
    "pull_request:",
    "workflow_dispatch:",
    "concurrency:",
    "group: ${{ github.workflow }}-${{ github.ref }}",
    "cancel-in-progress: true",
    "permissions:",
    "contents: read",
    "runs-on: ubuntu-latest",
    "actions/checkout@v4",
    "actions/setup-node@v4",
    'node-version: "22"',
    'cache: "npm"',
    "run: npm ci",
    "./node_modules/.bin/tsc --noEmit --incremental false -p tsconfig.json",
    "run: npm test",
    "node scripts/check-pricing-drift.mjs --dry-run",
    "run: npm run build",
  ]) {
    assert.ok(ci.includes(needle), `ci.yml missing: ${needle}`);
  }

  const ordered = [
    "run: npm ci",
    "tsc --noEmit",
    "run: npm test",
    "--dry-run",
    "run: npm run build",
  ];
  let cursor = -1;
  for (const needle of ordered) {
    const index = ci.indexOf(needle, cursor + 1);
    assert.ok(index > cursor, `ci.yml step order broken at: ${needle}`);
    cursor = index;
  }
});

test("pricing-drift.yml declares cron, least privilege, artifact and Issue dedup", () => {
  const wf = readProjectFile(".github/workflows/pricing-drift.yml");
  for (const needle of [
    'cron: "0 2 * * 1"',
    "workflow_dispatch:",
    "dry_run:",
    "create_issue_on_failure:",
    "contents: read",
    "issues: write",
    "runs-on: ubuntu-latest",
    'node-version: "22"',
    "run: npm ci",
    "--report-json tmp/pricing-drift-report.json",
    "--report-md tmp/pricing-drift-report.md",
    "$GITHUB_STEP_SUMMARY",
    "actions/upload-artifact@v4",
    "retention-days: 14",
    "actions/github-script@v7",
    "state: 'open'",
    "labels: label",
    "pricing-drift",
    "getLabel",
    "createLabel",
    "createComment",
    "issues.create",
    "[Pricing Drift]",
    "[Pricing Check Warning]",
    "report.mode === 'dry-run'",
    "listForRepo",
    "openIssues.length > 0",
  ]) {
    assert.ok(wf.includes(needle), `pricing-drift.yml missing: ${needle}`);
  }

  // The open-issue lookup must happen before the "append a comment" branch.
  assert.ok(
    wf.indexOf("listForRepo") < wf.indexOf("openIssues.length > 0"),
    "pricing-drift.yml dedup lookup/branch order is broken",
  );
});
