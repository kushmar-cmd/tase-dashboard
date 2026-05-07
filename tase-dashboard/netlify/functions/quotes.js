const https = require("https");

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 8000 }, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
  });
}

async function fetchQuote(symbol, token) {
  const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${token}`;
  const raw = await httpsGet(url);
  const d = JSON.parse(raw);
  if (!d.c || d.c === 0) return null;
  return {
    symbol,
    regularMarketPrice: d.c,
    regularMarketChange: parseFloat((d.c - d.pc).toFixed(3)),
    regularMarketChangePercent: parseFloat(((d.c - d.pc) / d.pc * 100).toFixed(2)),
    regularMarketVolume: 0,
    regularMarketPreviousClose: d.pc,
    marketCap: null,
  };
}

exports.handler = async function (event) {
  const token = process.env.FINNHUB_KEY;
  if (!token) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "חסר FINNHUB_KEY ב-Netlify Environment Variables" }),
    };
  }

  const symbols = (event.queryStringParameters?.symbols || "").split(",").filter(Boolean);
  if (!symbols.length) return { statusCode: 400, body: "no symbols" };

  const stockSyms = symbols.filter(s => s !== "USDILS=X" && !s.startsWith("^"));
  const needFX    = symbols.includes("USDILS=X");

  // שליפת כל המניות במקביל
  const [quoteResults, fxResult] = await Promise.allSettled([
    Promise.all(stockSyms.map(s => fetchQuote(s, token).catch(() => null))),
    needFX ? httpsGet("https://open.er-api.com/v6/latest/USD") : Promise.resolve(null),
  ]);

  const allResults = [];

  if (quoteResults.status === "fulfilled") {
    for (const r of quoteResults.value) {
      if (r) allResults.push(r);
    }
  }

  if (needFX && fxResult.status === "fulfilled" && fxResult.value) {
    try {
      const rate = JSON.parse(fxResult.value)?.rates?.ILS;
      if (rate) allResults.push({
        symbol: "USDILS=X",
        regularMarketPrice: rate,
        regularMarketChange: 0,
        regularMarketChangePercent: 0,
        regularMarketVolume: 0,
        regularMarketPreviousClose: rate,
        marketCap: null,
      });
    } catch {}
  }

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ quoteResponse: { result: allResults } }),
  };
};
