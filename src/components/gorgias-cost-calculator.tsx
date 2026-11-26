"use client";

import { useMemo, useState } from "react";
import {
  AFFILIATE_FALLBACK_HREF,
  affiliateLinks,
  getAffiliateUrl,
  type AffiliateKey,
} from "@/config/affiliates";

const CALCULATOR_SUB_ID = "gorgias_calc";
const MONTHS_PER_YEAR = 12;

type BillingCycle = "monthly" | "annual";

type ScenarioInputs = {
  tickets: number;
  aiRate: number;
  seats: number;
  billing: BillingCycle;
};

type ModelAssumptions = {
  gorgiasBase: number;
  includedTickets: number;
  overagePerTicket: number;
  aiFeePerResolution: number;
  seatFee: number;
};

type ComparisonCard = {
  key: AffiliateKey;
  label: string;
  category: string;
  monthlyBase: number;
  includedTickets: number;
  overagePerTicket: number;
  aiFeePerResolution: number | null;
};

const DEFAULT_INPUTS: ScenarioInputs = {
  tickets: 1000,
  aiRate: 40,
  seats: 2,
  billing: "monthly",
};

const DEFAULT_ASSUMPTIONS: ModelAssumptions = {
  gorgiasBase: 60,
  includedTickets: 500,
  overagePerTicket: 0.12,
  aiFeePerResolution: 0.08,
  seatFee: 20,
};

// Illustrative rate cards for scenario modelling only. These are not vendor prices.
const COMPARISON_CARDS: ComparisonCard[] = [
  {
    key: "text",
    label: "Text",
    category: "Messaging",
    monthlyBase: 45,
    includedTickets: 600,
    overagePerTicket: 0.09,
    aiFeePerResolution: null,
  },
  {
    key: "livechat",
    label: "LiveChat",
    category: "Live chat",
    monthlyBase: 75,
    includedTickets: 700,
    overagePerTicket: 0.11,
    aiFeePerResolution: 0.1,
  },
  {
    key: "helpdesk",
    label: "HelpDesk",
    category: "Helpdesk",
    monthlyBase: 90,
    includedTickets: 900,
    overagePerTicket: 0.08,
    aiFeePerResolution: null,
  },
  {
    key: "smartsupp",
    label: "Smartsupp",
    category: "Live chat",
    monthlyBase: 55,
    includedTickets: 500,
    overagePerTicket: 0.1,
    aiFeePerResolution: 0.09,
  },
  {
    key: "zipchat",
    label: "Zipchat AI",
    category: "AI assistant",
    monthlyBase: 40,
    includedTickets: 400,
    overagePerTicket: 0.07,
    aiFeePerResolution: 0.06,
  },
];

const wholeMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const preciseMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
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
  return wholeNumber.format(value);
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
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
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  step: number;
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
        min={0}
        step={step}
        value={value}
        onChange={(event) => {
          const parsed = Number(event.target.value);
          onChange(Number.isFinite(parsed) ? Math.max(0, parsed) : 0);
        }}
        className="mt-1 w-full border-b border-line bg-transparent pb-1 font-mono text-sm focus:border-accent focus:outline-none"
      />
    </div>
  );
}

export default function GorgiasCostCalculator() {
  const [inputs, setInputs] = useState<ScenarioInputs>(DEFAULT_INPUTS);
  const [assumptions, setAssumptions] = useState<ModelAssumptions>(
    DEFAULT_ASSUMPTIONS,
  );

  const model = useMemo(() => {
    const aiResolutions = Math.round(
      (inputs.tickets * inputs.aiRate) / 100,
    );
    const humanTickets = inputs.tickets - aiResolutions;
    const overageTickets = Math.max(
      0,
      inputs.tickets - assumptions.includedTickets,
    );
    const ticketOverage = overageTickets * assumptions.overagePerTicket;
    const aiCharges = aiResolutions * assumptions.aiFeePerResolution;
    const seatCharges = inputs.seats * assumptions.seatFee;
    const gorgiasMonthly =
      assumptions.gorgiasBase + ticketOverage + aiCharges + seatCharges;
    const months = inputs.billing === "annual" ? MONTHS_PER_YEAR : 1;

    const comparisons = COMPARISON_CARDS.map((card) => {
      const cardOverageTickets = Math.max(
        0,
        inputs.tickets - card.includedTickets,
      );
      const cardAiCharges =
        card.aiFeePerResolution === null
          ? 0
          : aiResolutions * card.aiFeePerResolution;
      const monthly =
        card.monthlyBase +
        cardOverageTickets * card.overagePerTicket +
        cardAiCharges +
        seatCharges;
      const deltaMonthly = monthly - gorgiasMonthly;

      return {
        ...card,
        monthly,
        periodTotal: monthly * months,
        deltaMonthly,
        cardOverageTickets,
        cardAiCharges,
      };
    });

    return {
      aiResolutions,
      humanTickets,
      overageTickets,
      ticketOverage,
      aiCharges,
      seatCharges,
      gorgiasMonthly,
      gorgiasAnnual: gorgiasMonthly * MONTHS_PER_YEAR,
      comparisons,
    };
  }, [inputs, assumptions]);

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
            Adjust the scenario. Outputs are illustrative model results, not
            vendor quotes.
          </p>

          <div className="mt-7 space-y-8">
            <RangeField
              id="tickets"
              label="Monthly ticket volume"
              hint="Tickets handled per month."
              min={100}
              max={5000}
              step={50}
              value={inputs.tickets}
              onChange={(tickets) => setInputs({ ...inputs, tickets })}
            />
            <RangeField
              id="ai-rate"
              label="AI resolution rate"
              hint="Share of tickets resolved without a human agent."
              min={0}
              max={80}
              step={1}
              value={inputs.aiRate}
              onChange={(aiRate) => setInputs({ ...inputs, aiRate })}
            />
            <RangeField
              id="seats"
              label="Active support seats"
              hint="Seats used for the per-seat cost assumption."
              min={1}
              max={10}
              step={1}
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
              Annual figures are 12× monthly; no discount is assumed.
            </p>
          </div>

          <details className="mt-8 border-t border-line pt-5">
            <summary className="cursor-pointer text-sm font-medium hover:text-accent">
              Editable model assumptions
            </summary>
            <p className="mt-3 text-xs leading-6 text-muted">
              Illustrative values for scenario modelling. Replace them with
              figures you verify from current vendor pricing.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <AssumptionField
                id="assumption-base"
                label="Base platform fee / mo"
                value={assumptions.gorgiasBase}
                step={5}
                onChange={(gorgiasBase) =>
                  setAssumptions({ ...assumptions, gorgiasBase })
                }
              />
              <AssumptionField
                id="assumption-included"
                label="Included tickets / mo"
                value={assumptions.includedTickets}
                step={50}
                onChange={(includedTickets) =>
                  setAssumptions({ ...assumptions, includedTickets })
                }
              />
              <AssumptionField
                id="assumption-overage"
                label="Overage per ticket"
                value={assumptions.overagePerTicket}
                step={0.01}
                onChange={(overagePerTicket) =>
                  setAssumptions({ ...assumptions, overagePerTicket })
                }
              />
              <AssumptionField
                id="assumption-ai-fee"
                label="AI fee per resolution"
                value={assumptions.aiFeePerResolution}
                step={0.01}
                onChange={(aiFeePerResolution) =>
                  setAssumptions({ ...assumptions, aiFeePerResolution })
                }
              />
              <AssumptionField
                id="assumption-seat"
                label="Per-seat fee / mo"
                value={assumptions.seatFee}
                step={5}
                onChange={(seatFee) =>
                  setAssumptions({ ...assumptions, seatFee })
                }
              />
            </div>
          </details>
        </section>

        <section aria-labelledby="modeled-estimate">
          <h2 id="modeled-estimate" className="font-serif text-2xl tracking-tight">
            Gorgias-style modeled estimate
          </h2>
          <p className="mt-2 max-w-2xl text-xs leading-6 text-muted">
            A modeled cost estimator based on public pricing/overage mechanics:
            ticket allowance, per-ticket overage, AI per-resolution fee and
            seat cost. Every figure below is an assumption you can inspect and
            change.
          </p>

          <dl className="mt-7 grid gap-x-10 gap-y-3 sm:grid-cols-2">
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
              <dd className="font-mono">{count(model.overageTickets)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-line pb-2 text-sm">
              <dt className="text-muted">Ticket overage charge</dt>
              <dd className="font-mono">{moneyPrecise(model.ticketOverage)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-line pb-2 text-sm">
              <dt className="text-muted">AI resolution charge</dt>
              <dd className="font-mono">{moneyPrecise(model.aiCharges)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-line pb-2 text-sm">
              <dt className="text-muted">Seat charge</dt>
              <dd className="font-mono">{moneyPrecise(model.seatCharges)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-5 text-muted">
            The ticket allowance is applied to total tickets in this model,
            including AI-resolved ones, so overage and AI charges can stack.
          </p>

          <div className="mt-7 flex flex-wrap items-baseline justify-between gap-4 border-t border-line pt-6">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted">
                Modeled monthly
              </p>
              <p className="mt-1 font-serif text-3xl">
                {money(model.gorgiasMonthly)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.14em] text-muted">
                Annualized (12× monthly)
              </p>
              <p className="mt-1 font-mono text-lg">
                {money(model.gorgiasAnnual)}
              </p>
            </div>
          </div>
        </section>
      </div>

      <section className="mt-16 border-t border-line pt-10" aria-labelledby="comparison">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2
            id="comparison"
            className="font-serif text-2xl tracking-tight sm:text-3xl"
          >
            Side-by-side comparison
          </h2>
          <p className="text-xs text-muted">
            Verify live pricing on vendor site before deciding.
          </p>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-muted">
          Each card applies the same ticket, AI and seat formula using its own
          illustrative base fee, allowance and per-ticket rate. Delta compares
          with the Gorgias-style modeled estimate above. None of these figures
          are vendor quotes.
        </p>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {model.comparisons.map((card) => {
            const href = getAffiliateUrl(card.key, CALCULATOR_SUB_ID);
            const pending =
              !affiliateLinks[card.key].href.trim() ||
              href === AFFILIATE_FALLBACK_HREF;
            const delta = card.deltaMonthly;

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
                    <dt className="text-muted">Estimated monthly</dt>
                    <dd className="font-mono">{money(card.monthly)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">
                      Estimated {cycleLabel} cost
                    </dt>
                    <dd className="font-mono">{money(card.periodTotal)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Delta vs modeled</dt>
                    <dd className="font-mono">
                      {delta === 0
                        ? "Same"
                        : `${delta > 0 ? "+" : "−"}${money(Math.abs(delta))} / ${cycleLabel}`}
                    </dd>
                  </div>
                </dl>

                <p className="mt-4 text-xs leading-6 text-muted">
                  Assumed base {money(card.monthlyBase)} ·{" "}
                  {count(card.includedTickets)} included tickets · overage{" "}
                  {moneyPrecise(card.overagePerTicket)}/ticket · AI{" "}
                  {card.aiFeePerResolution === null
                    ? "not modelled"
                    : `${moneyPrecise(card.aiFeePerResolution)}/resolution`}.
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
