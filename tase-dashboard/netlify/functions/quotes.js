const https = require("https");

function request(options) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      const cookies = res.headers["set-cookie"] || [];
      res.on("data", c => data += c);
      res.on("end", () => resolve({ data, cookies, status: res.statusCode }));
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
    req.setTimeout(10000);
    req.end();
  });
}

async function getYahooCrumb() {
  const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  // שלב 1 — קבל session cookies
  const homeRes = await request({
    hostname: "finance.yahoo.com",
    path: "/",
    method: "GET",
    headers: {
      "User-Agent": UA,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
  });

  const cookieStr = homeRes.cookies
    .map(c => c.split(";")[0])
    .filter(Boolean)
    .join("; ");

  // שלב 2 — קבל crumb
  const crumbRes = await request({
    hostname: "query2.finance.yahoo.com",
    path: "/v1/test/getcrumb",
    method: "GET",
    headers: {
      "User-Agent": UA,
      "Cookie": cookieStr,
      "Accept": "*/*",
      "Referer": "https://finance.yahoo.com/",
    },
  });

  return { crumb: crumbRes.data.trim(), cookieStr };
}

async function fetchQuotes(symbols, crumb, cookieStr) {
  const fields = "regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketVolume,regularMarketPreviousClose,marketCap";
  const path = `/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(","))}&fields=${fields}&crumb=${encodeURIComponent(crumb)}`;
  const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";

  const res = await request({
    hostname: "query2.finance.yahoo.com",
    path,
    method: "GET",
    headers: {
      "User-Agent": UA,
      "Cookie": cookieStr,
      "Accept": "application/json",
      "Referer": "https://finance.yahoo.com/",
    },
  });

  const parsed = JSON.parse(res.data);
  return parsed?.quoteResponse?.result || [];
}

async function getFXRate() {
  return new Promise((resolve) => {
    https.get("https://open.er-api.com/v6/latest/USD", { timeout: 6000 }, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => {
        try {
          const rate = JSON.parse(data)?.rates?.ILS;
          resolve(rate || null);
        } catch { resolve(null); }
      });
    }).on("error", () => resolve(null));
  });
}

exports.handler = async function (event) {
  const symbols = (event.queryStringParameters?.symbols || "").split(",").filter(Boolean);
  if (!symbols.length) return { statusCode: 400, body: "no symbols" };

  const stockSyms = symbols.filter(s => s !== "USDILS=X");
  const needFX    = symbols.includes("USDILS=X");

  try {
    // קבל crumb + cookies מ-Yahoo Finance
    const { crumb, cookieStr } = await getYahooCrumb();

    // שלוף מניות ושער דולר במקביל
    const BATCH = 20;
    const batches = [];
    for (let i = 0; i < stockSyms.length; i += BATCH) {
      batches.push(stockSyms.slice(i, i + BATCH));
    }

    const [batchResults, fxRate] = await Promise.all([
      Promise.all(batches.map(b => fetchQuotes(b, crumb, cookieStr))),
      needFX ? getFXRate() : Promise.resolve(null),
    ]);

    const allResults = batchResults.flat();

    if (fxRate) {
      allResults.push({
        symbol: "USDILS=X",
        regularMarketPrice: fxRate,
        regularMarketChange: 0,
        regularMarketChangePercent: 0,
        regularMarketVolume: 0,
        regularMarketPreviousClose: fxRate,
        marketCap: null,
      });
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ quoteResponse: { result: allResults } }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
