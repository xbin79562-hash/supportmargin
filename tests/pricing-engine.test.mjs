import assert from "node:assert/strict";
import test from "node:test";

import {
  computeScenario,
  getDefaultAssumptions,
  getDefaultInputs,
  getEligibleGorgiasTiers,
  normalizeInputs,
} from "../src/lib/pricing/engine.ts";

function comparisonMap(result) {
  return Object.fromEntries(
    result.comparisons.map((comparison) => [comparison.key, comparison]),
  );
}

test("default monthly scenario matches the pre-refactor calculator output", () => {
  const result = computeScenario(
    getDefaultInputs(),
    getDefaultAssumptions(),
    "monthly",
  );
  const comparisons = comparisonMap(result);

  assert.equal(result.aiResolutions, 400);
  assert.equal(result.humanTickets, 600);
  assert.equal(result.gorgias.monthly, 740);
  assert.equal(result.gorgias.tier.id, "basic");
  assert.equal(result.gorgias.autoSelected, true);

  assert.equal(comparisons.smartsupp.monthly, 115);
  assert.equal(comparisons.text.monthly, 396);
  assert.equal(comparisons.helpdesk.monthly, 396);
  assert.equal(comparisons.livechat.monthly, 118);
  assert.equal(comparisons.zipchat.monthly, 300);
});

test("annual billing uses distinct annual per-month rates", () => {
  const inputs = getDefaultInputs();
  const assumptions = getDefaultAssumptions();
  const monthly = computeScenario(inputs, assumptions, "monthly");
  const annual = computeScenario(inputs, assumptions, "annual");
  const monthlyComparisons = comparisonMap(monthly);
  const annualComparisons = comparisonMap(annual);

  assert.equal(monthly.gorgias.monthly, 740);
  assert.equal(annual.gorgias.monthly, 660);
  assert.equal(annual.gorgias.tier.id, "pro");

  assert.equal(monthlyComparisons.smartsupp.monthly, 115);
  assert.equal(annualComparisons.smartsupp.monthly, 89);
  assert.equal(monthlyComparisons.text.monthly, 396);
  assert.equal(annualComparisons.text.monthly, 356);
  assert.equal(monthlyComparisons.helpdesk.monthly, 396);
  assert.equal(annualComparisons.helpdesk.monthly, 356);
  assert.equal(monthlyComparisons.livechat.monthly, 118);
  assert.equal(annualComparisons.livechat.monthly, 98);
  assert.equal(monthlyComparisons.zipchat.monthly, 300);
  assert.equal(annualComparisons.zipchat.monthly, 240);
});

test("Gorgias auto tier selection preserves the original eligible-tier rules", () => {
  const inputs = getDefaultInputs();
  const assumptions = getDefaultAssumptions();

  const monthly = computeScenario(inputs, assumptions, "monthly");
  assert.equal(monthly.gorgias.tier.id, "basic");
  assert.equal(monthly.gorgias.autoSelected, true);

  const annual = computeScenario(inputs, assumptions, "annual");
  assert.equal(annual.gorgias.tier.id, "pro");
  assert.equal(annual.gorgias.autoSelected, true);
});

test("Gorgias Starter is allowed at 3 seats monthly but excluded at 4 seats or annual billing", () => {
  const assumptions = {
    ...getDefaultAssumptions(),
    gorgiasTier: "starter",
  };

  const starterMonthly = computeScenario(
    { ...getDefaultInputs(), tickets: 100, seats: 3 },
    assumptions,
    "monthly",
  );
  assert.equal(starterMonthly.gorgias.tier.id, "starter");
  assert.equal(starterMonthly.gorgias.autoSelected, false);
  assert.equal(starterMonthly.gorgias.monthly, 70);

  const fourSeatsMonthly = computeScenario(
    { ...getDefaultInputs(), tickets: 100, seats: 4 },
    assumptions,
    "monthly",
  );
  assert.equal(fourSeatsMonthly.gorgias.tier.id, "basic");
  assert.equal(fourSeatsMonthly.gorgias.autoSelected, true);

  const starterAnnual = computeScenario(
    { ...getDefaultInputs(), tickets: 100, seats: 3 },
    assumptions,
    "annual",
  );
  assert.equal(starterAnnual.gorgias.tier.id, "basic");
  assert.equal(starterAnnual.gorgias.autoSelected, true);
  assert.equal(starterAnnual.gorgias.monthly, 86);

  assert.deepEqual(
    getEligibleGorgiasTiers(3, false).map((tier) => tier.id),
    ["starter", "basic", "pro", "advanced"],
  );
  assert.deepEqual(
    getEligibleGorgiasTiers(3, true).map((tier) => tier.id),
    ["basic", "pro", "advanced"],
  );
  assert.deepEqual(
    getEligibleGorgiasTiers(4, false).map((tier) => tier.id),
    ["basic", "pro", "advanced"],
  );
});

test("extreme boundary values stay finite and normalized", () => {
  const inputs = getDefaultInputs();
  const assumptions = getDefaultAssumptions();

  const zeroTickets = computeScenario(
    { ...inputs, tickets: 0 },
    assumptions,
    "monthly",
  );
  assert.equal(zeroTickets.aiResolutions, 0);
  assert.equal(zeroTickets.gorgias.monthly, 10);
  assert.ok(Number.isFinite(zeroTickets.gorgias.monthly));

  const zeroAi = computeScenario({ ...inputs, aiRate: 0 }, assumptions, "monthly");
  assert.equal(zeroAi.aiResolutions, 0);
  assert.equal(zeroAi.gorgias.monthly, 340);

  const fullAi = computeScenario(
    { ...inputs, aiRate: 100 },
    assumptions,
    "monthly",
  );
  assert.equal(fullAi.aiResolutions, 1000);
  assert.equal(fullAi.gorgias.monthly, 1340);
  assert.equal(comparisonMap(fullAi).zipchat.monthly, 300);

  const twentySeats = computeScenario(
    { ...inputs, seats: 20 },
    assumptions,
    "monthly",
  );
  assert.equal(twentySeats.gorgias.tier.id, "basic");
  assert.equal(comparisonMap(twentySeats).smartsupp.monthly, 707);
  assert.equal(comparisonMap(twentySeats).livechat.monthly, 1180);

  const hugeVolume = computeScenario(
    { ...inputs, tickets: 1_000_000 },
    assumptions,
    "monthly",
  );
  assert.equal(hugeVolume.gorgias.tier.id, "advanced");
  assert.equal(hugeVolume.gorgias.monthly, 759100);
  assert.ok(Number.isFinite(hugeVolume.gorgias.monthly));

  assert.deepEqual(
    normalizeInputs({
      tickets: -10,
      aiRate: 150,
      seats: -5,
      billing: "weekly",
    }),
    { tickets: 0, aiRate: 100, seats: 1, billing: "monthly" },
  );
});
