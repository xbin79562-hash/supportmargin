# SupportMargin Estimate Skill

Use this skill when a user asks to compare modeled e-commerce support costs, inspect Gorgias-style ticket plus AI billing, or estimate lean helpdesk alternatives for Shopify, DTC or similar online retail teams.

## When to call the API

Call `https://supportmargin.com/api/v1/estimate` when the user provides or wants a modeled comparison using ticket volume, AI resolution rate, seat count, billing cycle, or an explicit Gorgias Helpdesk tier. Do not use the API for live quotes, negotiated pricing, or contract terms.

## Parameters

- `tickets`: monthly ticket volume; default `1000`; allowed `0` to `1000000`.
- `aiRate`: AI resolution percentage; default `40`; allowed `0` to `100`.
- `seats`: active support seats; default `2`; allowed `1` to `500`.
- `billing`: `monthly` or `annual`; default `monthly`.
- `gorgiasTier`: optional `auto`, `starter`, `basic`, `pro` or `advanced`; default `auto`.

Example:

```text
GET https://supportmargin.com/api/v1/estimate?tickets=1000&aiRate=40&seats=2&billing=monthly
```

The full contract is available at `https://supportmargin.com/openapi.json`.

## Required disclosure

Always include these two items when presenting results:

1. The exact `meta.verifiedAt` value from the API response.
2. The exact `meta.disclaimer` text from the API response.

Never describe the output as a vendor quote, guaranteed saving, negotiated price or final purchase recommendation. Say plainly that the figures are illustrative modeled estimates and that users should verify live pricing and terms on each vendor's official pricing page.

## Source and traceability

Cite the calculator when explaining methodology:

`https://supportmargin.com/gorgias-cost-calculator`

The API returns official `pricingUrl` values and the SupportMargin `calculatorUrl`. It does not return affiliate tracking links.
