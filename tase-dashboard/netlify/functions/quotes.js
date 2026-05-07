const https = require("https");

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 9000 }, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
  });
}

exports.handler = async function (event) {
  const token = process.env.TWELVEDATA_KEY;
  if (!token) {
    return { statusCode: 500, body: JSON.stringify({ error: "חסר TWELVEDATA_KEY" }) };
  }

  const symbols = (event.queryStringParameters?.symbols || "").split(",").filter(Boolean);
  if (!symbols.length) return { statusCode: 400, body: "no symbols" };

  const stockSyms = symbols.filter(s => s !== "USDILS=X" && !s.startsWith("^"));
  const needFX    = symbols.includes("USDILS=X");

  // Twelve Data — שליפת כל המניות בבקשה אחת
  const taseSyms = stockSyms.map(s => s.replace(".TA", ""));
  const tdUrl = `https://api.twelvedata.com/quote?symbol=${taseSyms.join(",")}&exchange=TASE&apikey=${token}`;

  const [tdResult, fxResult] = await Promise.allSettled([
    httpsGet(tdUrl),
    needFX ? httpsGet("https://open.er-api.com/v6/latest/USD") : Promise.resolve(null),
  ]);

  const allResults = [];

  if (tdResult.status === "fulfilled") {
    try {
      const parsed = JSON.parse(tdResult.value);
      // אם מניה אחת — האובייקט ישירות. אם כמה — מפתחות לפי שם
      const entries = taseSyms.length === 1
        ? [[taseSyms[0], parsed]]
        : Object.entries(parsed);

      for (const [sym, q] of entries) {
        if (!q || q.status === "error" || !q.close) continue;
        const close = parseFloat(q.close);
        const prev  = parseFloat(q.previous_close);
        allResults.push({
          symbol: sym + ".TA",
          regularMarketPrice: close,
          regularMarketChange: parseFloat((close - prev).toFixed(3)),
          regularMarketChangePercent: parseFloat(q.percent_change || ((close - prev) / prev * 100).toFixed(2)),
          regularMarketVolume: parseInt(q.volume) || 0,
          regularMarketPreviousClose: prev,
          marketCap: null,
        });
      }
    } catch (e) {
      console.error("Parse error:", e.message, tdResult.value?.slice(0, 200));
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
