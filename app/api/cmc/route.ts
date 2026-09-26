import { env } from "cloudflare:workers";

type CmcQuoteResponse = {
  data?: {
    [id: string]: {
      quote?: {
        USD?: {
          price?: number;
          percent_change_24h?: number;
          last_updated?: string;
        };
      };
    };
  };
  status?: { error_message?: string | null };
};

type CaptureCheck = {
  endpoint: string;
  httpStatus: number;
  outcome: "admitted" | "rejected";
  issues: string[];
};

function receipt(capturedAt: string, checks: CaptureCheck[]) {
  return { capturedAt, checks };
}

type CmcGlobalResponse = {
  data?: {
    quote?: { USD?: { total_market_cap?: number; last_updated?: string } };
    btc_dominance?: number;
  };
  status?: { error_message?: string | null };
};

export async function GET() {
  const apiKey = env.CMC_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        ok: false,
        code: "CMC_KEY_MISSING",
        message: "Live CMC capture is not configured.",
        receipt: receipt(new Date().toISOString(), [
          { endpoint: "Server credential boundary", httpStatus: 503, outcome: "rejected", issues: ["CMC_KEY_MISSING"] },
        ]),
      },
      { status: 503 },
    );
  }

  const headers = { "X-CMC_PRO_API_KEY": apiKey, Accept: "application/json" };
  const capturedAt = new Date().toISOString();
  const [quoteResponse, globalResponse] = await Promise.all([
    fetch("https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?id=1&convert=USD", { headers }),
    fetch("https://pro-api.coinmarketcap.com/v1/global-metrics/quotes/latest?convert=USD", { headers }),
  ]);

  if (!quoteResponse.ok || !globalResponse.ok) {
    const checks: CaptureCheck[] = [
      {
        endpoint: "CMC /v2/cryptocurrency/quotes/latest",
        httpStatus: quoteResponse.status,
        outcome: quoteResponse.ok ? "admitted" : "rejected",
        issues: quoteResponse.ok ? [] : [`HTTP_${quoteResponse.status}`],
      },
      {
        endpoint: "CMC /v1/global-metrics/quotes/latest",
        httpStatus: globalResponse.status,
        outcome: globalResponse.ok ? "admitted" : "rejected",
        issues: globalResponse.ok ? [] : [`HTTP_${globalResponse.status}`],
      },
    ];
    return Response.json(
      {
        ok: false,
        code: "CMC_UPSTREAM_ERROR",
        message: "CoinMarketCap did not return an admissible response.",
        capturedAt,
        receipt: receipt(capturedAt, checks),
      },
      { status: 502 },
    );
  }

  const quote = (await quoteResponse.json()) as CmcQuoteResponse;
  const global = (await globalResponse.json()) as CmcGlobalResponse;
  const usd = quote.data?.["1"]?.quote?.USD;
  const metrics = global.data;
  const missingFields = [
    !Number.isFinite(usd?.price) && "quote.data.1.quote.USD.price",
    !Number.isFinite(metrics?.quote?.USD?.total_market_cap) && "global.data.quote.USD.total_market_cap",
    !Number.isFinite(metrics?.btc_dominance) && "global.data.btc_dominance",
  ].filter((field): field is string => Boolean(field));

  if (missingFields.length > 0 || !usd || !metrics?.quote?.USD || metrics.btc_dominance == null) {
    return Response.json(
      {
        ok: false,
        code: "CMC_SCHEMA_MISMATCH",
        message: "The CMC response was incomplete and was not admitted.",
        capturedAt,
        receipt: receipt(capturedAt, [
          {
            endpoint: "CMC response validation",
            httpStatus: 200,
            outcome: "rejected",
            issues: missingFields,
          },
        ]),
      },
      { status: 502 },
    );
  }

  return Response.json({
    ok: true,
    capturedAt,
    source: "CoinMarketCap Pro API",
    receipt: receipt(capturedAt, [
      { endpoint: "CMC /v2/cryptocurrency/quotes/latest", httpStatus: quoteResponse.status, outcome: "admitted", issues: [] },
      { endpoint: "CMC /v1/global-metrics/quotes/latest", httpStatus: globalResponse.status, outcome: "admitted", issues: [] },
    ]),
    records: [
      {
        title: "BTC market quote",
        source: "CMC /v2/cryptocurrency/quotes/latest",
        value: `$${usd.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · 24h ${(usd.percent_change_24h ?? 0).toFixed(2)}%`,
        state: "Admitted",
        observedAt: usd.last_updated ?? capturedAt,
      },
      {
        title: "Global market metrics",
        source: "CMC /v1/global-metrics/quotes/latest",
        value: `Market cap $${(metrics.quote.USD.total_market_cap / 1e12).toFixed(2)}T · BTC dominance ${metrics.btc_dominance.toFixed(2)}%`,
        state: "Admitted",
        observedAt: metrics.quote.USD.last_updated ?? capturedAt,
      },
    ],
  });
}
