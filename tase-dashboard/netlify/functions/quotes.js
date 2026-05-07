const https = require("https");

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 9000,
    }, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
  });
}

function toStooq(sym) {
  if (sym === "^TA125.TA") return "ta125.il";
  if (sym === "^TA35.TA")  return "ta35.il";
  return sym.replace(".TA", "").toLowerCase() + ".il";
}

function fromStooq(s) {
  const sym = s.trim().toLowerCase();
  if (sym === "ta125.il") return "^TA125.TA";
  if (sym === "ta35.il")  return "^TA35.TA";
  return sym.replace(".il", "").toUpperCase() + ".TA";
}

function parseCSV(csv) {
  const lines = csv.trim().split("\n");
  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const p = lines[i].split(",");
    if (p.length < 7) continue;
    const close = parseFloat(p[6]);
    const open  = parseFloat(p[3]);
    if (!close || close <= 0 || isNaN(close)) continue;
    results.push({
      symbol: fromStooq(p[0]),
      regularMarketPrice: close,
      regularMarketChange: parseFloat((close - open).toFixed(3)),
      regularMarketChangePercent: parseFloat(((close - open) / open * 100).toFixed(2)),
      regularMarketVolume: parseInt(p[7]) || 0,
      regularMarketPreviousClose: open,
      marketCap: null,
    });
  }
  return results;
}

exports.handler = async function (event) {
  const symbols = (event.queryStringParameters?.symbols || "").split(",").filter(Boolean);
  if (!symbols.length) return { statusCode: 400, body: "no symbols" };

  const stockSyms = symbols.filter(s => s !== "USDILS=X");
  const needFX    = symbols.includes("USDILS=X");

  // שליחת כל המניות בבקשה אחת + שער דולר במקביל
  const stooqSyms = stockSyms.map(toStooq).join(",");
  const stooqUrl  = `https://stooq.com/q/l/?s=${stooqSyms}&f=sd2t2ohlcv&h&e=csv`;
  const fxUrl     = "https://open.er-api.com/v6/latest/USD";

  const [csvResult, fxResult] = await Promise.allSettled([
    httpsGet(stooqUrl),
    needFX ? httpsGet(fxUrl) : Promise.resolve(null),
  ]);

  const allResults = [];

  if (csvResult.status === "fulfilled" && csvResult.value.includes(",")) {
    allResults.push(...parseCSV(csvResult.value));
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
