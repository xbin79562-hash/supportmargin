"use client";

import { useMemo, useState } from "react";
import pricingCatalog from "@/data/pricing-catalog.json";
import {
  AFFILIATE_FALLBACK_HREF,
  affiliateLinks,
  getAffiliateUrl,
} from "@/config/affiliates";
import {
  clamp,
  computeScenario,
  getDefaultAssumptions,
  getDefaultInputs,
  getGorgiasTiers,
  type GorgiasTierId,
  type ModelAssumptions,
  type PricingCatalog,
  type ScenarioInputs,
} from "@/lib/pricing/engine";

const CALCULATOR_SUB_ID = "gorgias_calc";
const catalog = pricingCatalog as unknown as PricingCatalog;
const PRICING_LABEL = catalog.pricingLabel;
const MONTHS_PER_YEAR = catalog.monthsPerYear;
const GORGIAS_TIERS = getGorgiasTiers();

const wholeMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: catalog.currency,
  maximumFractionDigits: 0,
});
const preciseMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: catalog.currency,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const wholeNumber = new Intl.NumberFormat("en-US");

function money(value: number) {
  return wholeMoney.format(value);
}

function moneyPrecise(value: number) {
  return preciseMoney.format(value);
}

function count(value: number) {
  return wholeNumber.format(Math.round(value));
}

function RangeField({
  id,
  label,
  hint,
  min,
  max,
  step,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={`${id}-range`} className="text-sm font-medium">
          {label}
        </label>
        <input
          id={`${id}-number`}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={`${label} value`}
          onChange={(event) =>
            onChange(clamp(Number(event.target.value), min, max))
          }
          className="w-24 border-b border-line bg-transparent pb-1 text-right font-mono text-sm focus:border-accent focus:outline-none"
        />
      </div>
      <input
        id={`${id}-range`}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-4 w-full accent-accent"
      />
      <p className="mt-2 text-xs leading-5 text-muted">{hint}</p>
    </div>
  );
}

function AssumptionField({
  id,
  label,
  value,
  step,
  min = 0,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  step: number;
  min?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-xs text-muted">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(event) => {
          const parsed = Number(event.target.value);
          onChange(Number.isFinite(parsed) ? Math.max(min, parsed) : min);
        }}
        className="mt-1 w-full border-b border-line bg-transparent pb-1 font-mono text-sm focus:border-accent focus:outline-none"
      />
    </div>
  );
}

export default function GorgiasCostCalculator() {
  const [inputs, setInputs] = useState<ScenarioInputs>(() => getDefaultInputs());
  const [assumptions, setAssumptions] = useState<ModelAssumptions>(
    () => getDefaultAssumptions(),
  );

  const monthlyModel = useMemo(
    () => computeScenario(inputs, assumptions, "monthly"),
    [inputs, assumptions],
  );
  const annualModel = useMemo(
    () => computeScenario(inputs, assumptions, "annual"),
    [inputs, assumptions],
  );
  const model = inputs.billing === "annual" ? annualModel : monthlyModel;
  const currentMonthly = model.gorgias.monthly;
  const currentAnnualized = currentMonthly * MONTHS_PER_YEAR;

  const cycleLabel = inputs.billing === "annual" ? "annual" : "monthly";

  return (
    <div>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <section aria-labelledby="scenario-inputs">
          <h2
            id="scenario-inputs"
            className="font-serif text-2xl tracking-tight"
          >
            Scenario inputs
          </h2>
          <p className="mt-2 text-xs leading-6 text-muted">
            {PRICING_LABEL}. Outputs are scenario results, not vendor quotes.
          </p>

          <div className="mt-7 space-y-8">
            <RangeField
              id="tickets"
              label="Monthly ticket volume"
              hint="Tickets handled per month."
              min={catalog.uiBounds.tickets.min}
              max={catalog.uiBounds.tickets.max}
              step={catalog.uiBounds.tickets.step}
              value={inputs.tickets}
              onChange={(tickets) => setInputs({ ...inputs, tickets })}
            />
            <RangeField
              id="ai-rate"
              label="AI resolution rate"
              hint="Share of tickets resolved without a human agent."
              min={catalog.uiBounds.aiRate.min}
              max={catalog.uiBounds.aiRate.max}
              step={catalog.uiBounds.aiRate.step}
              value={inputs.aiRate}
              onChange={(aiRate) => setInputs({ ...inputs, aiRate })}
            />
            <RangeField
              id="seats"
              label="Active support seats"
              hint="Used for seat-based comparison plans. Gorgias Helpdesk tiers include seats."
              min={catalog.uiBounds.seats.min}
              max={catalog.uiBounds.seats.max}
              step={catalog.uiBounds.seats.step}
              value={inputs.seats}
              onChange={(seats) => setInputs({ ...inputs, seats })}
            />
          </div>

          <div className="mt-8">
            <p className="text-sm font-medium">Billing cycle</p>
            <div
              role="group"
              aria-label="Billing cycle"
              className="mt-3 inline-flex border border-line"
            >
              {(["monthly", "annual"] as const).map((cycle) => (
                <button
                  key={cycle}
                  type="button"
                  aria-pressed={inputs.billing === cycle}
                  onClick={() => setInputs({ ...inputs, billing: cycle })}
                  className={`px-4 py-2 text-xs uppercase tracking-[0.12em] ${
                    inputs.billing === cycle
                      ? "bg-ink text-paper"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {cycle}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs leading-5 text-muted">
              Annual rates are distinct per-month rates, not monthly × 12.
            </p>
          </div>

          <details className="mt-8 border-t border-line pt-5">
            <summary className="cursor-pointer text-sm font-medium hover:text-accent">
              Editable pricing assumptions
            </summary>
            <p className="mt-3 text-xs leading-6 text-muted">
              {PRICING_LABEL}. Overages beyond plan AI allowances can be
              higher; adjust the AI fee directly to test that risk.
            </p>

            <div className="mt-5">
              <label
                htmlFor="gorgias-tier"
                className="text-xs text-muted"
              >
                Gorgias Helpdesk tier
              </label>
              <select
                id="gorgias-tier"
                value={assumptions.gorgiasTier}
                onChange={(event) =>
                  setAssumptions({
                    ...assumptions,
                    gorgiasTier: event.target.value as GorgiasTierId,
                  })
                }
                className="mt-1 w-full border-b border-line bg-transparent pb-1 font-mono text-sm focus:border-accent focus:outline-none"
              >
                <option value="auto">Auto — cheapest eligible tier</option>
                {GORGIAS_TIERS.map((tier) => (
                  <option
                    key={tier.id}
                    value={tier.id}
                    disabled={
                      (tier.monthlyOnly && inputs.billing === "annual") ||
                      (tier.maxSeats !== undefined &&
                        inputs.seats > tier.maxSeats)
                    }
                  >
                    {tier.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 space-y-7">
              <RangeField
                id="ai-fee-monthly"
                label="AI resolution fee — monthly"
                hint={`Editable assumption: ${moneyPrecise(catalog.defaults.assumptions.aiFeeMonthly)}/resolution on monthly billing.`}
                min={catalog.uiBounds.aiFee.min}
                max={catalog.uiBounds.aiFee.max}
                step={catalog.uiBounds.aiFee.step}
                value={assumptions.aiFeeMonthly}
                onChange={(aiFeeMonthly) =>
                  setAssumptions({ ...assumptions, aiFeeMonthly })
                }
              />
              <RangeField
                id="ai-fee-annual"
                label="AI resolution fee — annual"
                hint={`Editable assumption: ${moneyPrecise(catalog.defaults.assumptions.aiFeeAnnual)}/resolution on annual billing.`}
                min={catalog.uiBounds.aiFee.min}
                max={catalog.uiBounds.aiFee.max}
                step={catalog.uiBounds.aiFee.step}
                value={assumptions.aiFeeAnnual}
                onChange={(aiFeeAnnual) =>
                  setAssumptions({ ...assumptions, aiFeeAnnual })
                }
              />
              <AssumptionField
                id="zipchat-replies"
                label="Zipchat AI replies per resolution"
                value={assumptions.zipchatRepliesPerResolution}
                step={catalog.uiBounds.zipchatReplies.step}
                min={catalog.uiBounds.zipchatReplies.min}
                onChange={(zipchatRepliesPerResolution) =>
                  setAssumptions({ ...assumptions, zipchatRepliesPerResolution })
                }
              />
            </div>
          </details>
        </section>

        <section aria-labelledby="modeled-estimate">
          <h2
            id="modeled-estimate"
            className="font-serif text-2xl tracking-tight"
          >
            Gorgias-style modeled baseline
          </h2>
          <p className="mt-2 max-w-2xl text-xs leading-6 text-muted">
            {PRICING_LABEL}. Auto mode selects the cheapest eligible Helpdesk
            tier; AI resolutions are charged on top of ticket overages.
          </p>

          <div className="mt-6 border-t border-line pt-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">
              Selected Helpdesk tier
            </p>
            <p className="mt-1 font-serif text-xl">
              {model.gorgias.tier.label}
              {model.gorgias.autoSelected ? (
                <span className="ml-2 text-xs uppercase tracking-[0.12em] text-muted">
                  auto-selected
                </span>
              ) : null}
            </p>
          </div>

          <dl className="mt-6 grid gap-x-10 gap-y-3 sm:grid-cols-2">
            <div className="flex justify-between gap-4 border-b border-line pb-2 text-sm">
              <dt className="text-muted">Helpdesk base / mo</dt>
              <dd className="font-mono">{moneyPrecise(model.gorgias.rate)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-line pb-2 text-sm">
              <dt className="text-muted">Included tickets</dt>
              <dd className="font-mono">
                {count(model.gorgias.includedTickets)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-line pb-2 text-sm">
              <dt className="text-muted">AI-resolved tickets</dt>
              <dd className="font-mono">{count(model.aiResolutions)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-line pb-2 text-sm">
              <dt className="text-muted">Human-handled tickets</dt>
              <dd className="font-mono">{count(model.humanTickets)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-line pb-2 text-sm">
              <dt className="text-muted">Overage tickets</dt>
              <dd className="font-mono">
                {count(model.gorgias.overageTickets)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-line pb-2 text-sm">
              <dt className="text-muted">Ticket overage charge</dt>
              <dd className="font-mono">
                {moneyPrecise(model.gorgias.ticketOverage)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-line pb-2 text-sm">
              <dt className="text-muted">AI resolution charge</dt>
              <dd className="font-mono">
                {moneyPrecise(model.gorgias.aiCharges)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-line pb-2 text-sm">
              <dt className="text-muted">Gorgias seat charge</dt>
              <dd className="font-mono">{money(0)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-5 text-muted">
            Helpdesk tiers include seats; no separate Gorgias seat fee is added
            here.
          </p>

          <div className="mt-7 grid gap-4 border-t border-line pt-6 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted">
                Effective monthly — monthly plan
              </p>
              <p className="mt-1 font-serif text-2xl">
                {money(monthlyModel.gorgias.monthly)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted">
                Effective monthly — annual plan
              </p>
              <p className="mt-1 font-serif text-2xl">
                {money(annualModel.gorgias.monthly)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted">
                Annualized 12-month ({cycleLabel})
              </p>
              <p className="mt-1 font-mono text-lg">
                {money(currentAnnualized)}
              </p>
            </div>
          </div>
        </section>
      </div>

      <section
        className="mt-16 border-t border-line pt-10"
        aria-labelledby="comparison"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2
            id="comparison"
            className="font-serif text-2xl tracking-tight sm:text-3xl"
          >
            Side-by-side comparison
          </h2>
          <p className="text-xs text-muted">{PRICING_LABEL}</p>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-muted">
          Each card uses its own published billing structure. Text and HelpDesk
          share unified Text pricing; LiveChat covers human chat seats only,
          with AI add-ons billed separately. Every figure is a modeled estimate
          based on public November 2026 pricing — verify live pricing on vendor
          site.
        </p>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {model.comparisons.map((card) => {
            const href = getAffiliateUrl(card.key, CALCULATOR_SUB_ID);
            const pending =
              !affiliateLinks[card.key].href.trim() ||
              href === AFFILIATE_FALLBACK_HREF;
            const delta = (inputs.billing === "annual" ? card.annual : card.monthly) - currentMonthly;

            return (
              <article
                key={card.key}
                className="flex flex-col border border-line p-5"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-serif text-lg">{card.label}</h3>
                  <span className="text-xs uppercase tracking-[0.12em] text-muted">
                    {card.category}
                  </span>
                </div>

                <dl className="mt-5 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Effective monthly (monthly plan)</dt>
                    <dd className="font-mono">{money(card.monthly)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Effective monthly (annual plan)</dt>
                    <dd className="font-mono">{money(card.annual)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Annualized 12-month ({cycleLabel})</dt>
                    <dd className="font-mono">
                      {money(
                        (inputs.billing === "annual" ? card.annual : card.monthly) *
                          MONTHS_PER_YEAR,
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Delta vs Gorgias ({cycleLabel})</dt>
                    <dd className="font-mono">
                      {delta === 0
                        ? "Same"
                        : `${delta > 0 ? "+" : "−"}${money(Math.abs(delta))}`}
                    </dd>
                  </div>
                </dl>

                <p className="mt-4 text-xs leading-6 text-muted">
                  {card.detail}
                </p>

                <div className="mt-auto border-t border-line pt-5">
                  {pending ? (
                    <button
                      type="button"
                      disabled
                      className="inline-flex cursor-not-allowed items-center justify-center border border-line px-4 py-2 text-xs uppercase tracking-[0.12em] text-muted"
                    >
                      Partner link pending approval
                    </button>
                  ) : (
                    <a
                      href={href}
                      target="_blank"
                      rel="sponsored nofollow noopener"
                      className="inline-flex items-center gap-1.5 border border-accent px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-accent hover:bg-highlight"
                    >
                      Review on vendor site
                      <span aria-hidden="true">↗</span>
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
