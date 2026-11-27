import catalogJson from "../../data/pricing-catalog.json" with { type: "json" };

export type BillingCycle = "monthly" | "annual";

export type ScenarioInputs = {
  tickets: number;
  aiRate: number;
  seats: number;
  billing: BillingCycle;
};

export type GorgiasTierId = "auto" | "starter" | "basic" | "pro" | "advanced";

export type ConcreteGorgiasTierId = Exclude<GorgiasTierId, "auto">;

export type ModelAssumptions = {
  aiFeeMonthly: number;
  aiFeeAnnual: number;
  zipchatRepliesPerResolution: number;
  gorgiasTier: GorgiasTierId;
};

export type GorgiasTier = {
  id: ConcreteGorgiasTierId;
  label: string;
  monthlyRate: number;
  annualRate: number;
  includedTickets: number;
  overagePerTicket: number;
  maxSeats?: number;
  monthlyOnly?: boolean;
};

export type ComparisonKey =
  | "smartsupp"
  | "text"
  | "helpdesk"
  | "livechat"
  | "zipchat";

export type CostResult = {
  total: number;
  detail: string;
};

export type ComparisonResult = {
  key: ComparisonKey;
  label: string;
  category: string;
  detail: string;
  monthly: number;
  annual: number;
};

export type GorgiasResult = {
  tier: GorgiasTier;
  autoSelected: boolean;
  rate: number;
  includedTickets: number;
  overageTickets: number;
  ticketOverage: number;
  aiCharges: number;
  monthly: number;
};

export type ScenarioResult = {
  annual: boolean;
  aiResolutions: number;
  humanTickets: number;
  gorgias: GorgiasResult;
  comparisons: ComparisonResult[];
};

export type ProductMeta = {
  id: string;
  name: string;
  billingModel: string;
  pricingUrl: string;
  affiliateKey: string | null;
  notes: string;
};

export type GorgiasProduct = ProductMeta & {
  tiers: GorgiasTier[];
};

export type SmartsuppProduct = ProductMeta & {
  seatPlans: {
    solo: {
      label: string;
      maxSeats: number;
      monthlyRate: number;
      annualRate: number;
    };
    plus: {
      label: string;
      maxSeats: number;
      monthlyRate: number;
      annualRate: number;
    };
    expert: {
      label: string;
      maxSeats: number;
      monthlyRate: number;
      annualRate: number;
      extraSeatMonthlyRate: number;
      extraSeatAnnualRate: number;
    };
  };
  aiPacks: {
    label: string;
    size: number;
    monthlyRate: number;
    annualRate: number;
  };
};

export type TextProduct = ProductMeta & {
  plans: {
    essential: {
      label: string;
      monthlySeatRate: number;
      annualSeatRate: number;
      includedAiResolutions: number;
    };
    growth: {
      label: string;
      monthlySeatRate: number;
      annualSeatRate: number;
      includedAiResolutions: number;
    };
  };
  aiPacks: {
    size: number;
    rate: number;
  };
  ticketAllowance?: string;
};

export type HelpDeskProduct = ProductMeta & {
  reusesPricingFrom: "text";
};

export type LiveChatProduct = ProductMeta & {
  plans: {
    starter: {
      label: string;
      maxSeats: number;
      monthlySeatRate: number;
      annualSeatRate: number;
    };
    team: {
      label: string;
      minSeats: number;
      monthlySeatRate: number;
      annualSeatRate: number;
    };
  };
};

export type ZipchatProduct = ProductMeta & {
  replyTiers: Array<{
    label: string;
    includedReplies: number;
    monthlyRate: number;
    annualRate: number;
  }>;
  defaultRepliesPerResolution?: number;
};

export type PricingCatalog = {
  schemaVersion: number;
  verifiedAt: string;
  currency: string;
  pricingLabel: string;
  monthsPerYear: number;
  defaults: {
    inputs: ScenarioInputs;
    assumptions: ModelAssumptions;
  };
  normalization: {
    tickets: { min: number };
    aiRate: { min: number; max: number };
    seats: { min: number };
  };
  uiBounds: {
    tickets: { min: number; max: number; step: number };
    aiRate: { min: number; max: number; step: number };
    seats: { min: number; max: number; step: number };
    aiFee: { min: number; max: number; step: number };
    zipchatReplies: { min: number; step: number };
  };
  products: {
    gorgias: GorgiasProduct;
    smartsupp: SmartsuppProduct;
    text: TextProduct;
    helpdesk: HelpDeskProduct;
    livechat: LiveChatProduct;
    zipchat: ZipchatProduct;
  };
};

export const pricingCatalog = catalogJson as unknown as PricingCatalog;

export const PRICING_LABEL = pricingCatalog.pricingLabel;
export const MONTHS_PER_YEAR = pricingCatalog.monthsPerYear;

export const DEFAULT_INPUTS: ScenarioInputs = {
  ...pricingCatalog.defaults.inputs,
};

export const DEFAULT_ASSUMPTIONS: ModelAssumptions = {
  ...pricingCatalog.defaults.assumptions,
};

export const GORGIAS_TIERS: GorgiasTier[] = pricingCatalog.products.gorgias.tiers.map(
  (tier) => ({ ...tier }),
);

const preciseMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: pricingCatalog.currency,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const wholeNumber = new Intl.NumberFormat("en-US");

function moneyPrecise(value: number) {
  return preciseMoney.format(value);
}

function count(value: number) {
  return wholeNumber.format(Math.round(value));
}

export function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function finiteOr(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeNonNegative(value: unknown, fallback: number) {
  return Math.max(0, finiteOr(value, fallback));
}

function normalizeBillingCycle(value: unknown, fallback: BillingCycle): BillingCycle {
  return value === "monthly" || value === "annual" ? value : fallback;
}

function normalizeGorgiasTier(value: unknown, fallback: GorgiasTierId): GorgiasTierId {
  const valid: GorgiasTierId[] = ["auto", "starter", "basic", "pro", "advanced"];
  return valid.includes(value as GorgiasTierId) ? (value as GorgiasTierId) : fallback;
}

export function normalizeInputs(inputs: Partial<ScenarioInputs> = {}): ScenarioInputs {
  return {
    tickets: normalizeNonNegative(
      inputs.tickets,
      pricingCatalog.defaults.inputs.tickets,
    ),
    aiRate: clamp(
      finiteOr(inputs.aiRate, pricingCatalog.defaults.inputs.aiRate),
      pricingCatalog.normalization.aiRate.min,
      pricingCatalog.normalization.aiRate.max,
    ),
    seats: Math.max(
      pricingCatalog.normalization.seats.min,
      finiteOr(inputs.seats, pricingCatalog.defaults.inputs.seats),
    ),
    billing: normalizeBillingCycle(
      inputs.billing,
      pricingCatalog.defaults.inputs.billing,
    ),
  };
}

export function normalizeAssumptions(
  assumptions: Partial<ModelAssumptions> = {},
): ModelAssumptions {
  return {
    aiFeeMonthly: normalizeNonNegative(
      assumptions.aiFeeMonthly,
      pricingCatalog.defaults.assumptions.aiFeeMonthly,
    ),
    aiFeeAnnual: normalizeNonNegative(
      assumptions.aiFeeAnnual,
      pricingCatalog.defaults.assumptions.aiFeeAnnual,
    ),
    zipchatRepliesPerResolution: normalizeNonNegative(
      assumptions.zipchatRepliesPerResolution,
      pricingCatalog.defaults.assumptions.zipchatRepliesPerResolution,
    ),
    gorgiasTier: normalizeGorgiasTier(
      assumptions.gorgiasTier,
      pricingCatalog.defaults.assumptions.gorgiasTier,
    ),
  };
}

export function getDefaultInputs(): ScenarioInputs {
  return { ...DEFAULT_INPUTS };
}

export function getDefaultAssumptions(): ModelAssumptions {
  return { ...DEFAULT_ASSUMPTIONS };
}

export function getGorgiasTiers(): GorgiasTier[] {
  return GORGIAS_TIERS.map((tier) => ({ ...tier }));
}

export function calculateAiResolutions(tickets: number, aiRate: number) {
  return Math.round((normalizeNonNegative(tickets, 0) * clamp(aiRate, 0, 100)) / 100);
}

export function calculateSmartsupp(
  seats: number,
  aiResolutions: number,
  annual: boolean,
): CostResult {
  const product = pricingCatalog.products.smartsupp;
  const safeSeats = Math.max(
    pricingCatalog.normalization.seats.min,
    finiteOr(seats, pricingCatalog.defaults.inputs.seats),
  );
  const safeAiResolutions = normalizeNonNegative(aiResolutions, 0);

  let planLabel = product.seatPlans.plus.label;
  let planBase = annual
    ? product.seatPlans.plus.annualRate
    : product.seatPlans.plus.monthlyRate;
  let extraSeats = 0;
  let extraSeatRate = annual
    ? product.seatPlans.expert.extraSeatAnnualRate
    : product.seatPlans.expert.extraSeatMonthlyRate;

  if (safeSeats === product.seatPlans.solo.maxSeats) {
    planLabel = product.seatPlans.solo.label;
    planBase = annual
      ? product.seatPlans.solo.annualRate
      : product.seatPlans.solo.monthlyRate;
    extraSeatRate = 0;
  } else if (safeSeats > product.seatPlans.expert.maxSeats) {
    planLabel = `${product.seatPlans.expert.label} + extra seats`;
    planBase = annual
      ? product.seatPlans.expert.annualRate
      : product.seatPlans.expert.monthlyRate;
    extraSeats = safeSeats - product.seatPlans.expert.maxSeats;
  } else if (safeSeats > product.seatPlans.plus.maxSeats) {
    planLabel = product.seatPlans.expert.label;
    planBase = annual
      ? product.seatPlans.expert.annualRate
      : product.seatPlans.expert.monthlyRate;
  }

  const packs = Math.ceil(safeAiResolutions / product.aiPacks.size);
  const packRate = annual ? product.aiPacks.annualRate : product.aiPacks.monthlyRate;
  const total = planBase + extraSeats * extraSeatRate + packs * packRate;

  return {
    total,
    detail: `${planLabel} seat plan · unlimited human chats · ${packs} ${product.aiPacks.label}${packs === 1 ? "" : "s"} (${count(safeAiResolutions)} AI chats)`,
  };
}

export function calculateText(
  seats: number,
  aiResolutions: number,
  annual: boolean,
): CostResult {
  const product = pricingCatalog.products.text;
  const safeSeats = Math.max(
    pricingCatalog.normalization.seats.min,
    finiteOr(seats, pricingCatalog.defaults.inputs.seats),
  );
  const safeAiResolutions = normalizeNonNegative(aiResolutions, 0);

  const packRate = product.aiPacks.rate;
  const essentialSeatRate = annual
    ? product.plans.essential.annualSeatRate
    : product.plans.essential.monthlySeatRate;
  const growthSeatRate = annual
    ? product.plans.growth.annualSeatRate
    : product.plans.growth.monthlySeatRate;

  const essential =
    essentialSeatRate * safeSeats +
    Math.ceil(
      Math.max(0, safeAiResolutions - product.plans.essential.includedAiResolutions) /
        product.aiPacks.size,
    ) *
      packRate;
  const growth =
    growthSeatRate * safeSeats +
    Math.ceil(
      Math.max(0, safeAiResolutions - product.plans.growth.includedAiResolutions) /
        product.aiPacks.size,
    ) *
      packRate;

  const useGrowth = growth < essential;
  return {
    total: useGrowth ? growth : essential,
    detail: useGrowth
      ? `${product.plans.growth.label} selected · ${moneyPrecise(growthSeatRate)}/seat · ${product.plans.growth.includedAiResolutions} AI resolutions included · unlimited tickets`
      : `${product.plans.essential.label} selected · ${moneyPrecise(essentialSeatRate)}/seat · ${product.plans.essential.includedAiResolutions} AI resolutions included · unlimited tickets`,
  };
}

export function calculateLiveChat(seats: number, annual: boolean): CostResult {
  const product = pricingCatalog.products.livechat;
  const safeSeats = Math.max(
    pricingCatalog.normalization.seats.min,
    finiteOr(seats, pricingCatalog.defaults.inputs.seats),
  );

  const singleSeat = safeSeats === product.plans.starter.maxSeats;
  const rate = singleSeat
    ? annual
      ? product.plans.starter.annualSeatRate
      : product.plans.starter.monthlySeatRate
    : annual
      ? product.plans.team.annualSeatRate
      : product.plans.team.monthlySeatRate;

  return {
    total: safeSeats * rate,
    detail: singleSeat
      ? `${product.plans.starter.label} · strictly 1 seat · ${moneyPrecise(rate)}/seat`
      : `${product.plans.team.label} · ${safeSeats} seats · ${moneyPrecise(rate)}/seat`,
  };
}

export function calculateZipchat(
  aiResolutions: number,
  annual: boolean,
  repliesPerResolution: number,
): CostResult {
  const product = pricingCatalog.products.zipchat;
  const safeAiResolutions = normalizeNonNegative(aiResolutions, 0);
  const safeRepliesPerResolution = normalizeNonNegative(
    repliesPerResolution,
    product.defaultRepliesPerResolution ??
      pricingCatalog.defaults.assumptions.zipchatRepliesPerResolution,
  );

  const replies = safeAiResolutions * safeRepliesPerResolution;
  const chosen =
    product.replyTiers.find((tier) => replies <= tier.includedReplies) ??
    product.replyTiers[product.replyTiers.length - 1];
  const highestTier = product.replyTiers[product.replyTiers.length - 1];
  const beyondModeledTiers = replies > highestTier.includedReplies;

  return {
    total: annual ? chosen.annualRate : chosen.monthlyRate,
    detail: `${chosen.label} tier · ${count(replies)} modeled AI replies at ${safeRepliesPerResolution}/resolution${beyondModeledTiers ? " · beyond modeled tiers, verify custom pricing" : ""}`,
  };
}

export function getEligibleGorgiasTiers(seats: number, annual: boolean): GorgiasTier[] {
  const safeSeats = Math.max(
    pricingCatalog.normalization.seats.min,
    finiteOr(seats, pricingCatalog.defaults.inputs.seats),
  );

  return GORGIAS_TIERS.filter(
    (tier) =>
      !(tier.monthlyOnly && annual) &&
      !(tier.maxSeats !== undefined && safeSeats > tier.maxSeats),
  );
}

export function calculateGorgiasTier(
  tier: GorgiasTier,
  tickets: number,
  aiResolutions: number,
  aiFee: number,
  annual: boolean,
): GorgiasResult {
  const safeTickets = normalizeNonNegative(tickets, 0);
  const safeAiResolutions = normalizeNonNegative(aiResolutions, 0);
  const safeAiFee = normalizeNonNegative(aiFee, 0);
  const rate = annual ? tier.annualRate : tier.monthlyRate;
  const overageTickets = Math.max(0, safeTickets - tier.includedTickets);
  const ticketOverage = overageTickets * tier.overagePerTicket;
  const aiCharges = safeAiResolutions * safeAiFee;

  return {
    tier,
    autoSelected: false,
    rate,
    includedTickets: tier.includedTickets,
    overageTickets,
    ticketOverage,
    aiCharges,
    monthly: rate + ticketOverage + aiCharges,
  };
}

export function calculateGorgias(
  inputs: ScenarioInputs,
  assumptions: ModelAssumptions,
  billing: BillingCycle = inputs.billing,
): GorgiasResult {
  const normalizedInputs = normalizeInputs(inputs);
  const normalizedAssumptions = normalizeAssumptions(assumptions);
  const annual = billing === "annual";
  const aiResolutions = calculateAiResolutions(
    normalizedInputs.tickets,
    normalizedInputs.aiRate,
  );
  const aiFee = annual
    ? normalizedAssumptions.aiFeeAnnual
    : normalizedAssumptions.aiFeeMonthly;

  const eligible = getEligibleGorgiasTiers(normalizedInputs.seats, annual);
  const costForTier = (tier: GorgiasTier) =>
    calculateGorgiasTier(
      tier,
      normalizedInputs.tickets,
      aiResolutions,
      aiFee,
      annual,
    );

  const explicit =
    normalizedAssumptions.gorgiasTier === "auto"
      ? undefined
      : GORGIAS_TIERS.find(
          (tier) => tier.id === normalizedAssumptions.gorgiasTier,
        );

  const explicitEligible =
    explicit !== undefined && eligible.includes(explicit) ? explicit : undefined;

  const chosenTier =
    explicitEligible ??
    eligible
      .map(costForTier)
      .reduce((best, current) => (current.monthly < best.monthly ? current : best))
      .tier;

  return {
    ...costForTier(chosenTier),
    autoSelected: explicitEligible === undefined,
  };
}

export function computeScenario(
  inputs: ScenarioInputs,
  assumptions: ModelAssumptions,
  billing: BillingCycle = inputs.billing,
): ScenarioResult {
  const normalizedInputs = normalizeInputs(inputs);
  const normalizedAssumptions = normalizeAssumptions(assumptions);
  const annual = billing === "annual";
  const aiResolutions = calculateAiResolutions(
    normalizedInputs.tickets,
    normalizedInputs.aiRate,
  );
  const humanTickets = normalizedInputs.tickets - aiResolutions;

  const gorgias = calculateGorgias(normalizedInputs, normalizedAssumptions, billing);

  const smartsupp = calculateSmartsupp(
    normalizedInputs.seats,
    aiResolutions,
    annual,
  );
  const text = calculateText(normalizedInputs.seats, aiResolutions, annual);
  const livechat = calculateLiveChat(normalizedInputs.seats, annual);
  const zipchat = calculateZipchat(
    aiResolutions,
    annual,
    normalizedAssumptions.zipchatRepliesPerResolution,
  );

  const comparisons: ComparisonResult[] = [
    {
      key: "smartsupp",
      label: pricingCatalog.products.smartsupp.name,
      category: "Seat plan + AI packs",
      detail: smartsupp.detail,
      monthly: smartsupp.total,
      annual: calculateSmartsupp(normalizedInputs.seats, aiResolutions, true).total,
    },
    {
      key: "text",
      label: pricingCatalog.products.text.name,
      category: "Per seat + AI packs",
      detail: text.detail,
      monthly: text.total,
      annual: calculateText(normalizedInputs.seats, aiResolutions, true).total,
    },
    {
      key: "helpdesk",
      label: "HelpDesk (Text pricing)",
      category: "Unified Text pricing",
      detail: `${text.detail} · HelpDesk shares Text's unified pricing`,
      monthly: text.total,
      annual: calculateText(normalizedInputs.seats, aiResolutions, true).total,
    },
    {
      key: "livechat",
      label: pricingCatalog.products.livechat.name,
      category: "Human chat seats",
      detail: `${livechat.detail} · human chat seats only; AI add-on billed separately`,
      monthly: livechat.total,
      annual: calculateLiveChat(normalizedInputs.seats, true).total,
    },
    {
      key: "zipchat",
      label: pricingCatalog.products.zipchat.name,
      category: "AI reply tiers",
      detail: zipchat.detail,
      monthly: zipchat.total,
      annual: calculateZipchat(
        aiResolutions,
        true,
        normalizedAssumptions.zipchatRepliesPerResolution,
      ).total,
    },
  ];

  return {
    annual,
    aiResolutions,
    humanTickets,
    gorgias,
    comparisons,
  };
}
