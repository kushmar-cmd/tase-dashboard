const https = require("https");

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function yahooFetch(symbols) {
  return new Promise((resolve) => {
    const fields = "regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketVolume,regularMarketPreviousClose,marketCap";
    const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&fields=${fields}`;

    const options = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://finance.yahoo.com/",
        "Origin": "https://finance.yahoo.com",
      },
      timeout: 12000,
    };

    const req = https.get(url, options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        // Check if response is valid JSON before parsing
        const trimmed = data.trim();
        if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
          resolve({ ok: false, error: `Yahoo Finance: ${trimmed.slice(0, 80)}` });
          return;
        }
        try {
          const parsed = JSON.parse(data);
          const results = parsed?.quoteResponse?.result || [];
          resolve({ ok: true, results });
        } catch (e) {
          resolve({ ok: false, error: "JSON parse error" });
        }
      });
    });

    req.on("error", (err) => resolve({ ok: false, error: err.message }));
    req.on("timeout", () => { req.destroy(); resolve({ ok: false, error: "timeout" }); });
  });
}

exports.handler = async function (event) {
  const symbols = event.queryStringParameters?.symbols || "";
  if (!symbols) {
    return { statusCode: 400, body: JSON.stringify({ error: "no symbols" }) };
  }

  // Split into batches of 20 and fetch sequentially with delay
  const symbolList = symbols.split(",").filter(Boolean);
  const BATCH = 20;
  const allResults = [];

  for (let i = 0; i < symbolList.length; i += BATCH) {
    const batch = symbolList.slice(i, i + BATCH).join(",");
    const res = await yahooFetch(batch);

    if (res.ok) {
      allResults.push(...res.results);
    }

    // Wait 400ms between batches to avoid rate limiting
    if (i + BATCH < symbolList.length) {
      await sleep(400);
    }
  }

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache",
    },
    body: JSON.stringify({
      quoteResponse: { result: allResults }
    }),
  };
};
