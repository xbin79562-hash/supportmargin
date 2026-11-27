import catalogJson from "../../data/pricing-catalog.json" with { type: "json" };
import {
  computeScenario,
  normalizeAssumptions,
  normalizeInputs,
  PRICING_LABEL,
  type BillingCycle,
  type GorgiasTierId,
  type ModelAssumptions,
  type PricingCatalog,
  type ScenarioInputs,
} from "./engine.ts";

export const ESTIMATE_LIMITS = {
  tickets: { min: 0, max: 1_000_000 },
  aiRate: { min: 0, max: 100 },
  seats: { min: 1, max: 500 },
} as const;

const BILLING_CYCLES: readonly BillingCycle[] = ["monthly", "annual"];
const GORGIAS_TIERS: readonly GorgiasTierId[] = [
  "auto",
  "starter",
  "basic",
  "pro",
  "advanced",
];

const catalog = catalogJson as unknown as PricingCatalog;

export type ValidationIssue = {
  field: string;
  message: string;
  received: string;
};

export type EstimateErrorBody = {
  error: string;
  details: ValidationIssue[];
};

export type SelectedTier = {
  id: string;
  label: string;
};

export type EstimateRecord = {
  id: string;
  name: string;
  billingModel: string;
  monthlyCost: number;
  annualizedCost: number;
  selectedTier: SelectedTier | null;
  pricingUrl: string;
  notes: string;
};

export type EstimateResponseBody = {
  meta: {
    schemaVersion: number;
    verifiedAt: string;
    currency: string;
    disclaimer: string;
    source: "SupportMargin";
    calculatorUrl: string;
    docsUrl: string;
  };
  inputs: ScenarioInputs;
  assumptions: ModelAssumptions;
  summary: {
    aiResolutions: number;
    humanTickets: number;
    gorgiasBaselineMonthly: number;
    lowestAlternative: {
      id: string;
      name: string;
      monthlyCost: number;
      monthlySavingsVsGorgias: number;
    };
  };
  estimates: EstimateRecord[];
};

export type ParseEstimateResult =
  | { ok: true; inputs: ScenarioInputs; assumptions: ModelAssumptions }
  | { ok: false; body: EstimateErrorBody };

export type BuildEstimateResult =
  | { ok: true; status: 200; body: EstimateResponseBody }
  | { ok: false; status: 400; body: EstimateErrorBody };

function received(value: unknown) {
  if (value === null) return "null";
  if (Array.isArray(value) || typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function parseNumberField(
  source: Record<string, unknown>,
  field: string,
  fallback: number,
  min: number,
  max: number,
  requireInteger: boolean,
  issues: ValidationIssue[],
) {
  const raw = source[field];
  if (raw === undefined) return fallback;

  const value =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && raw.trim() !== ""
        ? Number(raw)
        : Number.NaN;

  if (!Number.isFinite(value)) {
    issues.push({
      field,
      message: `${field} must be a finite number.`,
      received: received(raw),
    });
    return fallback;
  }

  if (value < min || value > max) {
    issues.push({
      field,
      message: `${field} must be between ${min} and ${max}.`,
      received: received(raw),
    });
    return fallback;
  }

  if (requireInteger && !Number.isInteger(value)) {
    issues.push({
      field,
      message: `${field} must be an integer.`,
      received: received(raw),
    });
    return fallback;
  }

  return value;
}

function parseBilling(
  source: Record<string, unknown>,
  issues: ValidationIssue[],
): BillingCycle {
  const raw = source.billing;
  if (raw === undefined) return "monthly";

  if (typeof raw === "string" && BILLING_CYCLES.includes(raw as BillingCycle)) {
    return raw as BillingCycle;
  }

  issues.push({
    field: "billing",
    message: `billing must be one of: ${BILLING_CYCLES.join(", ")}.`,
    received: received(raw),
  });
  return "monthly";
}

function parseGorgiasTier(
  source: Record<string, unknown>,
  issues: ValidationIssue[],
): GorgiasTierId {
  const raw = source.gorgiasTier;
  if (raw === undefined) return "auto";

  if (typeof raw === "string" && GORGIAS_TIERS.includes(raw as GorgiasTierId)) {
    return raw as GorgiasTierId;
  }

  issues.push({
    field: "gorgiasTier",
    message: `gorgiasTier must be one of: ${GORGIAS_TIERS.join(", ")}.`,
    received: received(raw),
  });
  return "auto";
}

export function parseEstimateRequest(source: Record<string, unknown>): ParseEstimateResult {
  const issues: ValidationIssue[] = [];

  const tickets = parseNumberField(
    source,
    "tickets",
    catalog.defaults.inputs.tickets,
    ESTIMATE_LIMITS.tickets.min,
    ESTIMATE_LIMITS.tickets.max,
    true,
    issues,
  );
  const aiRate = parseNumberField(
    source,
    "aiRate",
    catalog.defaults.inputs.aiRate,
    ESTIMATE_LIMITS.aiRate.min,
    ESTIMATE_LIMITS.aiRate.max,
    false,
    issues,
  );
  const seats = parseNumberField(
    source,
    "seats",
    catalog.defaults.inputs.seats,
    ESTIMATE_LIMITS.seats.min,
    ESTIMATE_LIMITS.seats.max,
    true,
    issues,
  );
  const billing = parseBilling(source, issues);
  const gorgiasTier = parseGorgiasTier(source, issues);

  if (issues.length > 0) {
    return {
      ok: false,
      body: {
        error: "Invalid request parameters",
        details: issues,
      },
    };
  }

  return {
    ok: true,
    inputs: normalizeInputs({ tickets, aiRate, seats, billing }),
    assumptions: normalizeAssumptions({
      ...catalog.defaults.assumptions,
      gorgiasTier,
    }),
  };
}

export function buildEstimateResponse(
  source: Record<string, unknown>,
): BuildEstimateResult {
  const parsed = parseEstimateRequest(source);
  if (!parsed.ok) {
    return { ok: false, status: 400, body: parsed.body };
  }

  const scenario = computeScenario(
    parsed.inputs,
    parsed.assumptions,
    parsed.inputs.billing,
  );
  const annual = parsed.inputs.billing === "annual";
  const gorgiasMonthly = scenario.gorgias.monthly;

  const alternatives = scenario.comparisons.map((comparison) => ({
    id: comparison.key,
    name: comparison.label === "HelpDesk (Text pricing)" ? "HelpDesk" : comparison.label,
    monthlyCost: annual ? comparison.annual : comparison.monthly,
  }));

  const lowest = alternatives.reduce((best, current) =>
    current.monthlyCost < best.monthlyCost ? current : best,
  );

  const gorgiasEstimate: EstimateRecord = {
    id: "gorgias",
    name: catalog.products.gorgias.name,
    billingModel: catalog.products.gorgias.billingModel,
    monthlyCost: gorgiasMonthly,
    annualizedCost: gorgiasMonthly * catalog.monthsPerYear,
    selectedTier: {
      id: scenario.gorgias.tier.id,
      label: scenario.gorgias.tier.label,
    },
    pricingUrl: catalog.products.gorgias.pricingUrl,
    notes: catalog.products.gorgias.notes,
  };

  const alternativeEstimates: EstimateRecord[] = alternatives.map((alternative) => {
    const product = catalog.products[alternative.id as keyof typeof catalog.products];
    return {
      id: alternative.id,
      name: product.name,
      billingModel: product.billingModel,
      monthlyCost: alternative.monthlyCost,
      annualizedCost: alternative.monthlyCost * catalog.monthsPerYear,
      selectedTier: null,
      pricingUrl: product.pricingUrl,
      notes: product.notes,
    };
  });

  return {
    ok: true,
    status: 200,
    body: {
      meta: {
        schemaVersion: catalog.schemaVersion,
        verifiedAt: catalog.verifiedAt,
        currency: catalog.currency,
        disclaimer: PRICING_LABEL,
        source: "SupportMargin",
        calculatorUrl: "https://supportmargin.com/gorgias-cost-calculator",
        docsUrl: "https://supportmargin.com/llms.txt",
      },
      inputs: parsed.inputs,
      assumptions: parsed.assumptions,
      summary: {
        aiResolutions: scenario.aiResolutions,
        humanTickets: scenario.humanTickets,
        gorgiasBaselineMonthly: gorgiasMonthly,
        lowestAlternative: {
          id: lowest.id,
          name: lowest.name,
          monthlyCost: lowest.monthlyCost,
          monthlySavingsVsGorgias: gorgiasMonthly - lowest.monthlyCost,
        },
      },
      estimates: [gorgiasEstimate, ...alternativeEstimates],
    },
  };
}
