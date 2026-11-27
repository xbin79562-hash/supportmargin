import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const HANDOFF_LOG_VERSION = 1;
const PRICE_TOLERANCE = 1;

const MONTH_NAMES = {
  january: "01",
  february: "02",
  march: "03",
  april: "04",
  may: "05",
  june: "06",
  july: "07",
  august: "08",
  september: "09",
  october: "10",
  november: "11",
  december: "12",
};

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "against",
  "because",
  "being",
  "between",
  "could",
  "every",
  "first",
  "from",
  "have",
  "helpdesk",
  "into",
  "modeled",
  "notes",
  "pricing",
  "rough",
  "should",
  "support",
  "that",
  "their",
  "there",
  "these",
  "thing",
  "this",
  "those",
  "under",
  "using",
  "vendor",
  "what",
  "when",
  "with",
  "without",
  "would",
  "your",
]);

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} not found: ${filePath}`);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
}

async function loadEngine(root) {
  const enginePath = path.join(root, "src/lib/pricing/engine.ts");
  return import(pathToFileURL(enginePath).href);
}

async function loadBlogLib(root) {
  const blogPath = path.join(root, "src/lib/blog.ts");
  return import(pathToFileURL(blogPath).href);
}

function loadCatalog(root) {
  return readJson(path.join(root, "src/data/pricing-catalog.json"), "pricing catalog");
}

function addCheck(result, name, status, message) {
  result.checks.push({ name, status, message });
  if (status === "fail") result.failures.push(`${name}: ${message}`);
  if (status === "warn") result.warnings.push(`${name}: ${message}`);
}

function extractVerificationDates(text) {
  const dates = new Set();
  const namePattern = new RegExp(
    `\\b(${Object.keys(MONTH_NAMES).join("|")})\\s+(20\\d{2})\\b`,
    "gi",
  );
  for (const match of text.matchAll(namePattern)) {
    dates.add(`${match[2]}-${MONTH_NAMES[match[1].toLowerCase()]}`);
  }
  const isoPattern = /\b(20\d{2})-(0[1-9]|1[0-2])\b/g;
  for (const match of text.matchAll(isoPattern)) {
    dates.add(`${match[1]}-${match[2]}`);
  }
  return [...dates].sort();
}

function claimValue(result, claim, billing) {
  const annual = billing === "annual";
  if (claim.id === "gorgias") {
    if (claim.field === "monthlyCost") return result.gorgias.monthly;
    if (claim.field === "annualizedCost") return result.gorgias.monthly * 12;
    return Number.NaN;
  }

  const comparison = result.comparisons.find((item) => item.key === claim.id);
  if (!comparison) return Number.NaN;
  if (claim.field === "monthlyCost") {
    return annual ? comparison.annual : comparison.monthly;
  }
  if (claim.field === "annualizedCost") {
    return (annual ? comparison.annual : comparison.monthly) * 12;
  }
  return Number.NaN;
}

export async function runPricingFactGate({
  root = DEFAULT_ROOT,
  approvedDir,
  content,
} = {}) {
  const result = {
    ok: false,
    failures: [],
    warnings: [],
    checks: [],
    details: [],
  };

  if (!approvedDir) {
    addCheck(result, "pricing-claims-path", "fail", "approvedDir is required.");
    return result;
  }

  const catalog = loadCatalog(root);
  const articleText =
    typeof content === "string"
      ? content
      : fs.existsSync(path.join(approvedDir, "dist/blog-ready.md"))
        ? fs.readFileSync(path.join(approvedDir, "dist/blog-ready.md"), "utf8")
        : fs.readFileSync(path.join(approvedDir, "01-blog-article.md"), "utf8");

  if (/\billustrative\b|\bmodeled\b/i.test(articleText)) {
    addCheck(result, "modeled-label", "pass", "illustrative/modeled labeling found.");
  } else {
    addCheck(
      result,
      "modeled-label",
      "fail",
      "Article content has no illustrative/modeled labeling.",
    );
  }

  if (/verify live pricing/i.test(articleText)) {
    addCheck(
      result,
      "vendor-verification-note",
      "pass",
      "Live pricing verification note found.",
    );
  } else {
    addCheck(
      result,
      "vendor-verification-note",
      "fail",
      "Article content has no 'verify live pricing' note.",
    );
  }

  const commissionRatePattern =
    /(?:\$|USD\s*)?\d+(?:\.\d+)?\s*%[^.\n]{0,60}\bcommission\b|\bcommission\b[^.\n]{0,60}?\d+(?:\.\d+)?\s*%/i;
  if (commissionRatePattern.test(articleText)) {
    addCheck(
      result,
      "commission-claim",
      "fail",
      "Article contains a fixed commission rate claim.",
    );
  } else {
    addCheck(result, "commission-claim", "pass", "No fixed commission rate claim found.");
  }

  if (/\bguaranteed savings\b/i.test(articleText)) {
    addCheck(
      result,
      "guaranteed-savings",
      "fail",
      "Article contains unqualified 'guaranteed savings' wording.",
    );
  } else {
    addCheck(result, "guaranteed-savings", "pass", "No guaranteed-savings claim found.");
  }

  const verificationDates = extractVerificationDates(articleText);
  if (verificationDates.length === 0) {
    addCheck(
      result,
      "verification-date",
      "warn",
      "No explicit pricing verification month found in article text.",
    );
  } else {
    const stale = verificationDates.filter((date) => date < catalog.verifiedAt);
    if (stale.length > 0) {
      addCheck(
        result,
        "verification-date",
        "fail",
        `Article pricing month ${stale.join(", ")} is stale versus catalog verifiedAt ${catalog.verifiedAt}.`,
      );
    } else {
      addCheck(
        result,
        "verification-date",
        "pass",
        `Article pricing month is current with catalog verifiedAt ${catalog.verifiedAt}.`,
      );
    }
  }

  const claimsPath = path.join(approvedDir, "pricing-claims.json");
  if (!fs.existsSync(claimsPath)) {
    addCheck(
      result,
      "pricing-claims",
      "warn",
      "No optional pricing-claims.json found; generic fact checks only.",
    );
  } else {
    const claimsFile = readJson(claimsPath, "pricing-claims.json");
    if (claimsFile.verifiedAt && claimsFile.verifiedAt < catalog.verifiedAt) {
      addCheck(
        result,
        "pricing-claims-verified-at",
        "fail",
        `pricing-claims.json verifiedAt ${claimsFile.verifiedAt} is stale versus ${catalog.verifiedAt}.`,
      );
    } else {
      addCheck(
        result,
        "pricing-claims-verified-at",
        "pass",
        "pricing-claims.json verifiedAt is current.",
      );
    }

    const engine = await loadEngine(root);
    const scenarioInput = {
      ...engine.getDefaultInputs(),
      ...(claimsFile.scenario ?? {}),
    };
    const assumptions = {
      ...engine.getDefaultAssumptions(),
      ...(claimsFile.assumptions ?? {}),
    };
    const computed = engine.computeScenario(
      scenarioInput,
      assumptions,
      scenarioInput.billing,
    );

    const claims = Array.isArray(claimsFile.claims) ? claimsFile.claims : [];
    let claimFailures = 0;

    for (const claim of claims) {
      const actual = claimValue(computed, claim, scenarioInput.billing);
      const expected = Number(claim.expected);
      const delta = Number.isFinite(actual) && Number.isFinite(expected)
        ? Math.abs(actual - expected)
        : Number.POSITIVE_INFINITY;
      const detail = {
        claim: `${claim.id}.${claim.field}`,
        expected,
        actual: Number.isFinite(actual) ? actual : null,
        delta: Number.isFinite(delta) ? delta : null,
      };
      result.details.push(detail);

      if (delta > PRICE_TOLERANCE) {
        claimFailures += 1;
        result.failures.push(
          `price-claim ${detail.claim}: expected $${expected}, calculated $${detail.actual}, delta $${detail.delta}`,
        );
      }
    }

    addCheck(
      result,
      "pricing-claims",
      claimFailures === 0 ? "pass" : "fail",
      claimFailures === 0
        ? `All ${claims.length} declared claim(s) match engine output within $${PRICE_TOLERANCE}.`
        : `${claimFailures} declared claim(s) exceed the $${PRICE_TOLERANCE} tolerance.`,
    );
  }

  result.ok = result.failures.length === 0;
  return result;
}

export function formatPricingGateReport(result) {
  const lines = ["Gate 3: pricing fact check"];
  for (const check of result.checks) {
    lines.push(`  [${check.status.toUpperCase()}] ${check.name}: ${check.message}`);
  }
  for (const detail of result.details) {
    lines.push(
      `  CLAIM ${detail.claim}: expected=${detail.expected}, calculated=${detail.actual}, delta=${detail.delta}`,
    );
  }
  lines.push(
    result.ok
      ? `Gate 3: PASS${result.warnings.length > 0 ? ` (${result.warnings.length} warning(s))` : ""}`
      : `Gate 3: FAIL (${result.failures.length} failure(s))`,
  );
  return lines.join("\n");
}

export function handoffLogPath(root = DEFAULT_ROOT) {
  return path.join(root, "content-pipeline/handoff-log.json");
}

export function readHandoffLog({ root = DEFAULT_ROOT } = {}) {
  const filePath = handoffLogPath(root);
  if (!fs.existsSync(filePath)) {
    return { schemaVersion: HANDOFF_LOG_VERSION, entries: [] };
  }
  const parsed = readJson(filePath, "content-pipeline/handoff-log.json");
  if (!Array.isArray(parsed.entries)) {
    throw new Error("handoff-log.json has no entries array.");
  }
  return parsed;
}

function tokenize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 4 && !STOP_WORDS.has(token));
}

export function checkTopicOverlap(log, candidate = {}) {
  const candidateTokens = new Set([
    ...tokenize(candidate.title),
    ...(Array.isArray(candidate.keywords) ? candidate.keywords.flatMap(tokenize) : []),
  ]);
  const matches = [];

  for (const entry of log.entries ?? []) {
    if (candidate.slug && entry.slug === candidate.slug) continue;
    const entryTokens = new Set([
      ...tokenize(entry.title),
      ...(Array.isArray(entry.keywords) ? entry.keywords.flatMap(tokenize) : []),
    ]);
    const shared = [...candidateTokens].filter((token) => entryTokens.has(token));
    const denominator = Math.max(1, candidateTokens.size);
    const score = shared.length / denominator;
    if (shared.length >= 3 || score >= 0.5) {
      matches.push({ slug: entry.slug, score, shared });
    }
  }

  return {
    hasOverlap: matches.length > 0,
    matches,
  };
}

function blogStatus(entry) {
  const channels = entry.channels ?? {};
  const blog = channels.blog;
  if (typeof blog === "string") return blog;
  return blog?.status ?? "pending";
}

export function scanStalePosts({ root = DEFAULT_ROOT, log = readHandoffLog({ root }) } = {}) {
  const catalog = loadCatalog(root);
  return (log.entries ?? [])
    .filter((entry) => ["published", "synced"].includes(blogStatus(entry)))
    .filter((entry) => String(entry.catalogVerifiedAt ?? "") < catalog.verifiedAt)
    .map((entry) => ({
      slug: entry.slug,
      title: entry.title,
      catalogVerifiedAt: entry.catalogVerifiedAt ?? null,
      currentVerifiedAt: catalog.verifiedAt,
      catalogSchemaVersion: entry.catalogSchemaVersion ?? null,
      currentSchemaVersion: catalog.schemaVersion,
    }));
}

export function recordHandoffEntry({
  root = DEFAULT_ROOT,
  entry = {},
} = {}) {
  if (!entry.slug || !entry.title) {
    throw new Error("handoff entry requires slug and title.");
  }

  const catalog = loadCatalog(root);
  const log = readHandoffLog({ root });
  const now = new Date().toISOString();
  const normalized = {
    slug: entry.slug,
    title: entry.title,
    keywords: Array.isArray(entry.keywords) ? entry.keywords : [],
    catalogSchemaVersion: entry.catalogSchemaVersion ?? catalog.schemaVersion,
    catalogVerifiedAt: entry.catalogVerifiedAt ?? catalog.verifiedAt,
    channels: entry.channels ?? {
      blog: "pending",
      x: "pending",
      reddit: "pending",
    },
    lastGateStatus: entry.lastGateStatus ?? "pass",
    updatedAt: now,
  };

  const index = log.entries.findIndex((item) => item.slug === normalized.slug);
  if (index === -1) log.entries.push(normalized);
  else log.entries[index] = normalized;

  const filePath = handoffLogPath(root);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(log, null, 2)}\n`, "utf8");
  return normalized;
}

function yamlString(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function truncateWords(text, maxWords) {
  const words = String(text).replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}…`;
}

function deriveFrontmatter(slug, source) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const h1Index = lines.findIndex((line) => /^#\s+/.test(line));
  const title = h1Index >= 0 ? lines[h1Index].replace(/^#\s+/, "").trim() : slug;
  const bodyLines = h1Index >= 0 ? lines.filter((_line, index) => index !== h1Index) : lines;
  const body = bodyLines.join("\n").replace(/^\n+/, "").trim();

  const paragraphs = body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0 && !paragraph.startsWith(">"));
  const firstParagraph = paragraphs[0] ?? title;
  const answerCapsule = truncateWords(firstParagraph, 55);
  const description = truncateWords(answerCapsule, 24);

  return {
    slug,
    title,
    description,
    publishedAt: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString().slice(0, 10),
    answerCapsule,
    tags: ["E-commerce support", "Cost modeling"],
    body,
  };
}

export async function normalizeBlogDocument({
  root = DEFAULT_ROOT,
  slug,
  source,
  overrides = {},
} = {}) {
  if (!slug || typeof source !== "string") {
    throw new Error("normalizeBlogDocument requires slug and source.");
  }

  const blogLib = await loadBlogLib(root);
  let parsed = null;
  let bodySource = source;

  if (source.startsWith("---\n")) {
    parsed = blogLib.parseFrontmatter(source);
    bodySource = parsed.content;
  }

  const derived = deriveFrontmatter(slug, bodySource);
  const frontmatter = {
    ...derived,
    ...(parsed?.data ?? {}),
    ...overrides,
  };

  const requiredStringFields = [
    "slug",
    "title",
    "description",
    "publishedAt",
    "updatedAt",
    "answerCapsule",
  ];
  for (const field of requiredStringFields) {
    if (typeof frontmatter[field] !== "string" || frontmatter[field].length === 0) {
      throw new Error(`normalized frontmatter is missing ${field}.`);
    }
  }
  if (!Array.isArray(frontmatter.tags) || frontmatter.tags.length === 0) {
    throw new Error("normalized frontmatter is missing tags.");
  }

  const body = bodySource.replace(/^#\s+.*\n+/, "").trim();
  const yaml = [
    "---",
    `slug: ${yamlString(frontmatter.slug)}`,
    `title: ${yamlString(frontmatter.title)}`,
    `description: ${yamlString(frontmatter.description)}`,
    `publishedAt: ${yamlString(frontmatter.publishedAt)}`,
    `updatedAt: ${yamlString(frontmatter.updatedAt)}`,
    "answerCapsule: >",
    `  ${frontmatter.answerCapsule.replace(/\s+/g, " ")}`,
    "tags:",
    ...frontmatter.tags.map((tag) => `  - ${yamlString(tag)}`),
    "---",
    "",
    body,
    "",
  ].join("\n");

  const parsedOutput = blogLib.parseFrontmatter(yaml);
  for (const field of requiredStringFields) {
    if (typeof parsedOutput.data[field] !== "string" || parsedOutput.data[field].length === 0) {
      throw new Error(`blog.ts could not parse ${field} from normalized document.`);
    }
  }
  if (!Array.isArray(parsedOutput.data.tags)) {
    throw new Error("blog.ts could not parse tags from normalized document.");
  }

  return yaml;
}
