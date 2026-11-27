import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = path.join(root, "src/data/pricing-catalog.json");
const baselinePath = path.join(root, "scripts/pricing-drift-baseline.json");
const requestTimeoutMs = 8000;
const summaryLimit = 12000;
const expectedProductIds = [
  "gorgias",
  "smartsupp",
  "text",
  "helpdesk",
  "livechat",
  "zipchat",
];

export const REPORT_SCHEMA_VERSION = 1;

const OPERATOR_CHECKLIST = [
  "1. Open each drifted vendor's official pricing page and confirm the change by hand. Never treat a `failed` fetch as a price increase.",
  "2. Update `src/data/pricing-catalog.json` with the verified numbers and bump `verifiedAt` to the new verification month.",
  "3. Regenerate `scripts/pricing-drift-baseline.json` with `node scripts/check-pricing-drift.mjs --update-baseline` once the catalog is corrected.",
  "4. Run `node .workbuddy/skills/supportmargin-content-studio/scripts/distribute.mjs --audit-stale` to list published articles whose `catalogVerifiedAt` is now stale.",
  "5. Re-run `npm test` and `npm run build`, then re-check Gate 3 before any content is distributed.",
].join("\n");

// ---------------------------------------------------------------------------
// Argument parsing
//
// Legacy flags (--dry-run, --update-baseline) keep their exact behaviour and
// error wording. New options:
//   --report-json <path>  write a machine-readable JSON report
//   --report-md <path>    write a human-readable Markdown report
//   --fail-on-drift       keep the legacy non-zero exit code in report mode
//
// Exit code contract:
//   * Without any report option: 100% legacy behaviour (changed/failed -> 1).
//   * In report mode: drift/failures are recorded in the report but do not
//     abort the run, so CI can still publish the summary/artifact/issue.
//     Pass --fail-on-drift to restore the legacy hard-fail behaviour.
// ---------------------------------------------------------------------------
export function parseArgs(argv = []) {
  const flags = new Set(["--dry-run", "--update-baseline", "--fail-on-drift"]);
  const valueOptions = new Set(["--report-json", "--report-md"]);
  const seenFlags = new Set();
  const values = new Map();
  const unknownArgs = [];
  const errors = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (flags.has(arg)) {
      seenFlags.add(arg);
      continue;
    }

    if (valueOptions.has(arg)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        errors.push(`Missing value for ${arg}`);
        continue;
      }
      values.set(arg, value);
      index += 1;
      continue;
    }

    if (arg.startsWith("--") && arg.includes("=")) {
      const separator = arg.indexOf("=");
      const key = arg.slice(0, separator);
      const value = arg.slice(separator + 1);
      if (valueOptions.has(key) && value.length > 0) {
        values.set(key, value);
        continue;
      }
      if (flags.has(key)) {
        errors.push(`${key} does not accept a value`);
        continue;
      }
    }

    unknownArgs.push(arg);
  }

  return {
    dryRun: seenFlags.has("--dry-run"),
    updateBaseline: seenFlags.has("--update-baseline"),
    failOnDrift: seenFlags.has("--fail-on-drift"),
    reportJson: values.get("--report-json") ?? null,
    reportMd: values.get("--report-md") ?? null,
    unknownArgs,
    errors,
  };
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateUrl(value, label) {
  assert(typeof value === "string" && value.trim().length > 0, `${label} is empty`);
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} is not a valid URL: ${value}`);
  }
  assert(
    parsed.protocol === "http:" || parsed.protocol === "https:",
    `${label} must use http or https: ${value}`,
  );
  return parsed.toString();
}

function readJson(filePath, label) {
  assert(fs.existsSync(filePath), `${label} not found: ${filePath}`);
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
}

function validateCatalog(catalog) {
  assert(isPlainObject(catalog), "pricing catalog root must be an object");
  assert(
    Number.isInteger(catalog.schemaVersion) && catalog.schemaVersion > 0,
    "schemaVersion must be a positive integer",
  );
  assert(
    typeof catalog.verifiedAt === "string" && catalog.verifiedAt.length > 0,
    "verifiedAt must be a non-empty string",
  );
  assert(catalog.currency === "USD", "currency must be USD");
  assert(
    typeof catalog.pricingLabel === "string" && catalog.pricingLabel.length > 0,
    "pricingLabel must be a non-empty string",
  );
  assert(
    Number.isFinite(catalog.monthsPerYear) && catalog.monthsPerYear > 0,
    "monthsPerYear must be a positive number",
  );
  assert(isPlainObject(catalog.defaults), "defaults must be an object");
  assert(isPlainObject(catalog.defaults.inputs), "defaults.inputs must be an object");
  assert(
    isPlainObject(catalog.defaults.assumptions),
    "defaults.assumptions must be an object",
  );
  assert(isPlainObject(catalog.products), "products must be an object");

  const actualIds = Object.keys(catalog.products);
  for (const expectedId of expectedProductIds) {
    assert(
      actualIds.includes(expectedId),
      `missing product in catalog: ${expectedId}`,
    );
  }

  for (const id of actualIds) {
    const product = catalog.products[id];
    assert(isPlainObject(product), `product ${id} must be an object`);
    assert(product.id === id, `product ${id} has mismatched id: ${product.id}`);
    assert(
      typeof product.name === "string" && product.name.length > 0,
      `product ${id}.name must be a non-empty string`,
    );
    assert(
      typeof product.billingModel === "string" && product.billingModel.length > 0,
      `product ${id}.billingModel must be a non-empty string`,
    );
    assert(
      product.affiliateKey === null ||
        (typeof product.affiliateKey === "string" && product.affiliateKey.length > 0),
      `product ${id}.affiliateKey must be a string or null`,
    );
    assert(
      typeof product.notes === "string" && product.notes.length > 0,
      `product ${id}.notes must be a non-empty string`,
    );
    validateUrl(product.pricingUrl, `product ${id}.pricingUrl`);
  }
}

function loadBaseline() {
  if (!fs.existsSync(baselinePath)) {
    return { schemaVersion: 1, generatedAt: null, products: {} };
  }
  return readJson(baselinePath, "pricing drift baseline");
}

function textSummary(html) {
  return html
    .replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#36;/g, "$")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, summaryLimit);
}

function visiblePrices(summary) {
  const matches =
    summary.match(/\$\s?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?/g) ?? [];
  return [...new Set(matches.map((value) => value.replace(/\s+/g, "")))].slice(0, 50);
}

function hashSummary(summary) {
  return crypto.createHash("sha256").update(summary).digest("hex");
}

async function fetchSnapshot(product) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(product.pricingUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": "SupportMarginPricingDrift/1.0 (+https://supportmargin.com)",
        accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
      },
    });

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status} ${response.statusText}`.trim());
      // Non-2xx (including 403/429 anti-bot blocks) carries an HTTP status so
      // the report can label it as `failed` instead of a price change.
      error.statusCode = response.status;
      throw error;
    }

    const summary = textSummary(await response.text());
    return {
      pricingUrl: product.pricingUrl,
      checkedAt: new Date().toISOString(),
      summaryHash: hashSummary(summary),
      visiblePrices: visiblePrices(summary),
    };
  } finally {
    clearTimeout(timer);
  }
}

function sameStrings(left = [], right = []) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function writeBaseline(baseline) {
  fs.writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
}

// ---------------------------------------------------------------------------
// Pure, importable report helpers (no network, safe for unit tests)
// ---------------------------------------------------------------------------
export function classifySnapshot(previous, snapshot) {
  if (!previous?.summaryHash) {
    return { status: "baseline_unset", reasons: [] };
  }

  const hashChanged = previous.summaryHash !== snapshot.summaryHash;
  const pricesChanged = !sameStrings(previous.visiblePrices, snapshot.visiblePrices);

  if (!hashChanged && !pricesChanged) {
    return { status: "unchanged", reasons: [] };
  }

  const reasons = [];
  if (hashChanged) reasons.push("page text summary hash changed");
  if (pricesChanged) reasons.push("visible USD prices changed");
  return { status: "drifted", reasons };
}

export function buildReport({ mode, catalogVerifiedAt, results }) {
  const select = (status) => results.filter((result) => result.status === status);
  const unchanged = select("unchanged");
  const drifted = select("drifted");
  const failed = select("failed");
  const baselineUnset = select("baseline_unset");
  const skipped = select("skipped");

  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    mode,
    catalogVerifiedAt: catalogVerifiedAt ?? null,
    counts: {
      unchanged: unchanged.length,
      drifted: drifted.length,
      failed: failed.length,
      baselineUnset: baselineUnset.length,
      skipped: skipped.length,
    },
    unchanged,
    drifted,
    failed,
    baselineUnset,
    skipped,
    results,
  };
}

function cell(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function priceSample(prices) {
  if (!Array.isArray(prices) || prices.length === 0) return "(none)";
  const head = prices.slice(0, 8).join(", ");
  const extra = prices.length > 8 ? ` (+${prices.length - 8} more)` : "";
  return `\`${head}\`${extra}`;
}

export function renderMarkdown(report) {
  const lines = [
    "# SupportMargin Pricing Drift Report",
    "",
    `- Generated at (UTC): ${report.generatedAt}`,
    `- Mode: \`${report.mode}\``,
    `- Catalog \`verifiedAt\`: ${report.catalogVerifiedAt ?? "unknown"}`,
    `- Counts: unchanged=${report.counts.unchanged}, drifted=${report.counts.drifted}, failed=${report.counts.failed}, baselineUnset=${report.counts.baselineUnset}, skipped=${report.counts.skipped}`,
    "",
    "## Drifted (price or page changes detected)",
    "",
  ];

  if (report.drifted.length === 0) {
    lines.push("None.");
  } else {
    lines.push("| Product | Pricing URL | Reasons | Baseline prices | Latest extracted prices |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const item of report.drifted) {
      lines.push(
        `| ${cell(item.name)} | ${cell(item.pricingUrl)} | ${cell(item.reasons?.join("; "))} | ${priceSample(item.baselinePrices)} | ${priceSample(item.currentPrices)} |`,
      );
    }
  }

  lines.push("", "## Failed (fetch errors, NOT price changes)", "");
  if (report.failed.length === 0) {
    lines.push("None.");
  } else {
    lines.push("| Product | Pricing URL | HTTP status | Error |");
    lines.push("| --- | --- | --- | --- |");
    for (const item of report.failed) {
      lines.push(
        `| ${cell(item.name)} | ${cell(item.pricingUrl)} | ${item.statusCode ?? "n/a (network/timeout)"} | ${cell(item.error)} |`,
      );
    }
  }

  lines.push(
    "",
    "> Timeouts, non-2xx responses and anti-bot blocks are recorded as `failed` only. They are deliberately kept out of `drifted` so a blocked page is never misreported as a price increase.",
    "",
    "## Unchanged",
    "",
  );
  lines.push(
    report.unchanged.length === 0
      ? "None."
      : report.unchanged.map((item) => `- ${item.name}: ${item.pricingUrl}`).join("\n"),
  );

  lines.push("", "## Baseline unset / skipped", "");
  const pending = [...report.baselineUnset, ...report.skipped];
  lines.push(
    pending.length === 0
      ? "None."
      : pending.map((item) => `- ${item.name} (${item.status}): ${item.pricingUrl}`).join("\n"),
  );

  lines.push("", "## Operator checklist", "", OPERATOR_CHECKLIST, "");
  return lines.join("\n");
}

export function writeReports(report, { reportJson = null, reportMd = null } = {}) {
  const written = [];
  const writeOne = (target, content) => {
    if (!target) return;
    const absolute = path.isAbsolute(target) ? target : path.join(root, target);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, content, "utf8");
    written.push(absolute);
  };

  writeOne(reportJson, `${JSON.stringify(report, null, 2)}\n`);
  writeOne(reportMd, renderMarkdown(report));
  return written;
}

// ---------------------------------------------------------------------------
// CLI paths (legacy console output is preserved verbatim)
// ---------------------------------------------------------------------------
async function runDryRun(catalog, options) {
  validateCatalog(catalog);
  console.log("DRY-RUN: pricing catalog structure and URLs are valid.");
  console.log(
    `schemaVersion=${catalog.schemaVersion} verifiedAt=${catalog.verifiedAt} currency=${catalog.currency}`,
  );
  console.log(`products=${expectedProductIds.length}`);
  for (const id of expectedProductIds) {
    const product = catalog.products[id];
    console.log(`- ${product.id}: ${product.pricingUrl}`);
  }
  console.log("No network requests were made.");

  if (options.reportJson || options.reportMd) {
    const results = expectedProductIds.map((id) => {
      const product = catalog.products[id];
      return {
        id,
        name: product.name,
        pricingUrl: product.pricingUrl,
        status: "skipped",
        reason: "dry-run: no network request was made",
      };
    });
    const report = buildReport({
      mode: "dry-run",
      catalogVerifiedAt: catalog.verifiedAt,
      results,
    });
    for (const file of writeReports(report, options)) {
      console.log(`Report written: ${file}`);
    }
  }
}

async function runLiveCheck(catalog, baseline, options) {
  validateCatalog(catalog);
  const nextBaseline = {
    schemaVersion: 1,
    generatedAt: baseline.generatedAt ?? null,
    products: { ...baseline.products },
  };

  const results = [];
  let changed = 0;
  let failed = 0;
  let unset = 0;

  for (const id of expectedProductIds) {
    const product = catalog.products[id];
    const base = { id, name: product.name, pricingUrl: product.pricingUrl };

    try {
      const snapshot = await fetchSnapshot(product);
      nextBaseline.products[id] = snapshot;

      const previous = baseline.products?.[id];
      if (!previous?.summaryHash) {
        unset += 1;
        console.log(`[BASELINE_UNSET] ${product.name}: snapshot captured; run with --update-baseline to save it.`);
        results.push({
          ...base,
          status: "baseline_unset",
          checkedAt: snapshot.checkedAt,
          currentPrices: snapshot.visiblePrices,
          reason: "no baseline snapshot recorded yet",
        });
        continue;
      }

      const priceDetail = {
        baselinePrices: previous.visiblePrices ?? [],
        currentPrices: snapshot.visiblePrices,
        baselineHash: previous.summaryHash,
        currentHash: snapshot.summaryHash,
        checkedAt: snapshot.checkedAt,
      };
      const outcome = classifySnapshot(previous, snapshot);

      if (outcome.status === "drifted") {
        changed += 1;
        console.log(`[CHANGED] ${product.name}: ${outcome.reasons.join("; ")}`);
        console.log(`  previous prices: ${JSON.stringify(previous.visiblePrices ?? [])}`);
        console.log(`  current prices:  ${JSON.stringify(snapshot.visiblePrices)}`);
        results.push({ ...base, status: "drifted", reasons: outcome.reasons, ...priceDetail });
      } else {
        console.log(`[STABLE] ${product.name}`);
        results.push({ ...base, status: "unchanged", ...priceDetail });
      }
    } catch (error) {
      failed += 1;
      console.log(`[FETCH_FAILED] ${product.name}: ${error.message}`);
      results.push({
        ...base,
        status: "failed",
        statusCode: Number.isInteger(error.statusCode) ? error.statusCode : null,
        error: error.message,
        reason: "fetch/network error, not a price change",
      });
    }
  }

  if (options.updateBaseline) {
    nextBaseline.generatedAt = new Date().toISOString();
    writeBaseline(nextBaseline);
    console.log(`Baseline updated: ${baselinePath}`);
  }

  console.log(
    `SUMMARY: changed=${changed} fetch_failed=${failed} baseline_unset=${unset}`,
  );

  const reportMode = Boolean(options.reportJson || options.reportMd);
  if (reportMode) {
    const report = buildReport({
      mode: "live",
      catalogVerifiedAt: catalog.verifiedAt,
      results,
    });
    for (const file of writeReports(report, options)) {
      console.log(`Report written: ${file}`);
    }
  }

  // Legacy callers (no report option) keep the original non-zero exit code.
  // Report mode defaults to a soft failure so the workflow can still publish
  // the summary, artifact and issue; --fail-on-drift restores the hard fail.
  if (!reportMode || options.failOnDrift) {
    if (failed > 0) {
      fail("One or more pricing pages could not be checked.");
    } else if (changed > 0) {
      fail("One or more pricing pages changed. Review and update the catalog if needed.");
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.unknownArgs.length > 0) {
    fail(`Unknown argument(s): ${options.unknownArgs.join(", ")}`);
    return;
  }
  if (options.errors.length > 0) {
    fail(options.errors.join("; "));
    return;
  }
  if (options.dryRun && options.updateBaseline) {
    fail("Use either --dry-run or --update-baseline, not both.");
    return;
  }

  try {
    const catalog = readJson(catalogPath, "pricing catalog");
    validateCatalog(catalog);

    if (options.dryRun) {
      await runDryRun(catalog, options);
      return;
    }

    const baseline = loadBaseline();
    await runLiveCheck(catalog, baseline, options);
  } catch (error) {
    fail(error.message);
  }
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;
if (invokedPath === import.meta.url) {
  await main();
}
