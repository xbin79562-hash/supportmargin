import { buildEstimateResponse, type EstimateErrorBody } from "../../../../lib/pricing/api-contract.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const successHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=3600, s-maxage=86400",
};

const errorHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function jsonResponse(body: unknown, status: number, headers: HeadersInit) {
  return new Response(JSON.stringify(body), { status, headers });
}

function invalidJsonBody(): EstimateErrorBody {
  return {
    error: "Invalid JSON body",
    details: [
      {
        field: "body",
        message: "POST body must be a valid JSON object.",
        received: "request body",
      },
    ],
  };
}

export function GET(request: Request) {
  const url = new URL(request.url);
  const source = Object.fromEntries(url.searchParams.entries());
  const result = buildEstimateResponse(source);

  return jsonResponse(
    result.body,
    result.status,
    result.ok ? successHeaders : errorHeaders,
  );
}

export async function POST(request: Request) {
  let parsedBody: unknown;

  try {
    parsedBody = await request.json();
  } catch {
    return jsonResponse(invalidJsonBody(), 400, errorHeaders);
  }

  if (
    parsedBody === null ||
    typeof parsedBody !== "object" ||
    Array.isArray(parsedBody)
  ) {
    return jsonResponse(invalidJsonBody(), 400, errorHeaders);
  }

  const result = buildEstimateResponse(parsedBody as Record<string, unknown>);
  return jsonResponse(
    result.body,
    result.status,
    result.ok ? successHeaders : errorHeaders,
  );
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
