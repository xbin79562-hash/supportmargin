import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  GET,
  OPTIONS,
  POST,
} from "../src/app/api/v1/estimate/route.ts";
import {
  computeScenario,
  getDefaultAssumptions,
  getDefaultInputs,
} from "../src/lib/pricing/engine.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiUrl = "https://supportmargin.com/api/v1/estimate";

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function estimateMap(body) {
  return Object.fromEntries(body.estimates.map((estimate) => [estimate.id, estimate]));
}

test("GET with default parameters returns 200 and matches engine output", async () => {
  const response = GET(
    new Request(
      `${apiUrl}?tickets=1000&aiRate=40&seats=2&billing=monthly`,
    ),
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
  assert.equal(
    response.headers.get("cache-control"),
    "public, max-age=3600, s-maxage=86400",
  );
  assert.equal(response.headers.get("access-control-allow-origin"), "*");

  const body = await response.json();
  const expected = computeScenario(
    getDefaultInputs(),
    getDefaultAssumptions(),
    "monthly",
  );
  const estimates = estimateMap(body);

  assert.equal(body.meta.source, "SupportMargin");
  assert.equal(body.meta.currency, "USD");
  assert.equal(body.meta.verifiedAt, "2026-11");
  assert.equal(body.meta.calculatorUrl, "https://supportmargin.com/gorgias-cost-calculator");
  assert.equal(body.meta.docsUrl, "https://supportmargin.com/llms.txt");
  assert.equal(body.estimates.length, 6);
  assert.equal(estimates.gorgias.monthlyCost, expected.gorgias.monthly);
  assert.equal(estimates.smartsupp.monthlyCost, expected.comparisons[0].monthly);
  assert.equal(estimates.text.monthlyCost, expected.comparisons[1].monthly);
  assert.equal(estimates.helpdesk.monthlyCost, expected.comparisons[2].monthly);
  assert.equal(estimates.livechat.monthlyCost, expected.comparisons[3].monthly);
  assert.equal(estimates.zipchat.monthlyCost, expected.comparisons[4].monthly);
});

test("POST with custom annual parameters returns the expected structure and summary", async () => {
  const payload = {
    tickets: 3000,
    aiRate: 40,
    seats: 5,
    billing: "annual",
  };
  const response = await POST(
    new Request(apiUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  const expected = computeScenario(
    { ...getDefaultInputs(), ...payload },
    getDefaultAssumptions(),
    "annual",
  );
  const estimates = estimateMap(body);
  const alternatives = body.estimates.filter((estimate) => estimate.id !== "gorgias");
  const recomputedLowest = alternatives.reduce((best, current) =>
    current.monthlyCost < best.monthlyCost ? current : best,
  );

  assert.deepEqual(body.inputs, payload);
  assert.equal(body.summary.aiResolutions, expected.aiResolutions);
  assert.equal(body.summary.humanTickets, expected.humanTickets);
  assert.equal(body.summary.gorgiasBaselineMonthly, expected.gorgias.monthly);
  assert.equal(estimates.gorgias.monthlyCost, expected.gorgias.monthly);
  assert.equal(estimates.gorgias.annualizedCost, expected.gorgias.monthly * 12);
  assert.deepEqual(estimates.gorgias.selectedTier, {
    id: expected.gorgias.tier.id,
    label: expected.gorgias.tier.label,
  });
  assert.equal(body.summary.lowestAlternative.id, recomputedLowest.id);
  assert.equal(
    body.summary.lowestAlternative.monthlySavingsVsGorgias,
    expected.gorgias.monthly - recomputedLowest.monthlyCost,
  );
});

test("invalid parameters and broken JSON return structured 400 errors", async () => {
  const invalidGet = GET(
    new Request(`${apiUrl}?tickets=abc&billing=weekly`),
  );
  assert.equal(invalidGet.status, 400);
  assert.equal(invalidGet.headers.get("cache-control"), "no-store");
  const invalidGetBody = await invalidGet.json();
  assert.equal(invalidGetBody.error, "Invalid request parameters");
  assert.deepEqual(
    invalidGetBody.details.map((issue) => issue.field),
    ["tickets", "billing"],
  );

  const invalidPost = await POST(
    new Request(apiUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tickets: -1, seats: 0 }),
    }),
  );
  assert.equal(invalidPost.status, 400);
  const invalidPostBody = await invalidPost.json();
  assert.equal(invalidPostBody.error, "Invalid request parameters");
  assert.deepEqual(
    invalidPostBody.details.map((issue) => issue.field),
    ["tickets", "seats"],
  );

  const brokenJson = await POST(
    new Request(apiUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not-json",
    }),
  );
  assert.equal(brokenJson.status, 400);
  const brokenJsonBody = await brokenJson.json();
  assert.equal(brokenJsonBody.error, "Invalid JSON body");
  assert.equal(brokenJsonBody.details[0].field, "body");
});

test("OPTIONS returns read-only CORS headers", () => {
  const response = OPTIONS();
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  assert.equal(
    response.headers.get("access-control-allow-methods"),
    "GET, POST, OPTIONS",
  );
  assert.equal(response.headers.get("access-control-allow-headers"), "Content-Type");
});

test("OpenAPI is valid and llms.txt lists only real local targets", () => {
  const openApi = JSON.parse(readProjectFile("public/openapi.json"));
  assert.equal(openApi.openapi, "3.1.0");
  assert.ok(openApi.paths["/api/v1/estimate"].get);
  assert.ok(openApi.paths["/api/v1/estimate"].post);
  assert.ok(openApi.paths["/api/v1/estimate"].options);

  const llms = readProjectFile("public/llms.txt");
  const urls = [...llms.matchAll(/https:\/\/supportmargin\.com\/[^\s)"']+/g)].map(
    (match) => new URL(match[0]).pathname,
  );
  const allowedTargets = new Map([
    ["/gorgias-cost-calculator", "src/app/gorgias-cost-calculator/page.tsx"],
    ["/blog", "src/app/blog/page.tsx"],
    [
      "/blog/001-gorgias-double-billing",
      "src/content/blog/001-gorgias-double-billing.md",
    ],
    ["/about", "src/app/about/page.tsx"],
    ["/affiliate-disclosure", "src/app/affiliate-disclosure/page.tsx"],
    ["/api/v1/estimate", "src/app/api/v1/estimate/route.ts"],
    ["/openapi.json", "public/openapi.json"],
    ["/supportmargin-skill.md", "public/supportmargin-skill.md"],
  ]);

  assert.ok(urls.length > 0);
  for (const urlPath of urls) {
    assert.ok(
      allowedTargets.has(urlPath),
      `llms.txt lists an unsupported path: ${urlPath}`,
    );
    assert.ok(
      fs.existsSync(path.join(root, allowedTargets.get(urlPath))),
      `llms.txt target does not exist: ${urlPath}`,
    );
  }
});
