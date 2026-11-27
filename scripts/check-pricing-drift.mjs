import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

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

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const updateBaseline = args.has("--update-baseline");
const unknownArgs = [...args].filter(
  (arg) => arg !== "--dry-run" && arg !== "--update-baseline",
);

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
      throw new Error(`HTTP ${response.status} ${response.statusText}`.trim());
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

async function runDryRun(catalog) {
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
}

async function runLiveCheck(catalog, baseline) {
  validateCatalog(catalog);
  const nextBaseline = {
    schemaVersion: 1,
    generatedAt: baseline.generatedAt ?? null,
    products: { ...baseline.products },
  };

  let changed = 0;
  let failed = 0;
  let unset = 0;

  for (const id of expectedProductIds) {
    const product = catalog.products[id];

    try {
      const snapshot = await fetchSnapshot(product);
      nextBaseline.products[id] = snapshot;

      const previous = baseline.products?.[id];
      if (!previous?.summaryHash) {
        unset += 1;
        console.log(`[BASELINE_UNSET] ${product.name}: snapshot captured; run with --update-baseline to save it.`);
        continue;
      }

      const hashChanged = previous.summaryHash !== snapshot.summaryHash;
      const pricesChanged = !sameStrings(previous.visiblePrices, snapshot.visiblePrices);

      if (hashChanged || pricesChanged) {
        changed += 1;
        const reasons = [];
        if (hashChanged) reasons.push("page text summary hash changed");
        if (pricesChanged) reasons.push("visible USD prices changed");
        console.log(`[CHANGED] ${product.name}: ${reasons.join("; ")}`);
        console.log(`  previous prices: ${JSON.stringify(previous.visiblePrices ?? [])}`);
        console.log(`  current prices:  ${JSON.stringify(snapshot.visiblePrices)}`);
      } else {
        console.log(`[STABLE] ${product.name}`);
      }
    } catch (error) {
      failed += 1;
      console.log(`[FETCH_FAILED] ${product.name}: ${error.message}`);
    }
  }

  if (updateBaseline) {
    nextBaseline.generatedAt = new Date().toISOString();
    writeBaseline(nextBaseline);
    console.log(`Baseline updated: ${baselinePath}`);
  }

  console.log(
    `SUMMARY: changed=${changed} fetch_failed=${failed} baseline_unset=${unset}`,
  );

  if (failed > 0) {
    fail("One or more pricing pages could not be checked.");
  } else if (changed > 0) {
    fail("One or more pricing pages changed. Review and update the catalog if needed.");
  }
}

async function main() {
  if (unknownArgs.length > 0) {
    fail(`Unknown argument(s): ${unknownArgs.join(", ")}`);
    return;
  }
  if (dryRun && updateBaseline) {
    fail("Use either --dry-run or --update-baseline, not both.");
    return;
  }

  try {
    const catalog = readJson(catalogPath, "pricing catalog");
    validateCatalog(catalog);

    if (dryRun) {
      await runDryRun(catalog);
      return;
    }

    const baseline = loadBaseline();
    await runLiveCheck(catalog, baseline);
  } catch (error) {
    fail(error.message);
  }
}

await main();
