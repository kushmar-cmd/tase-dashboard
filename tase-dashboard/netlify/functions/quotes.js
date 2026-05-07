// מביא נתונים מ-Stooq.com — עובד מהשרת ללא חסימות
const https = require("https");

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/csv,text/plain,*/*",
      },
      timeout: 12000,
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
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
  if (lines.length < 2) return [];
  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const p = lines[i].split(",");
    if (p.length < 7) continue;
    const close = parseFloat(p[6]);
    const open  = parseFloat(p[3]);
    const vol   = parseInt(p[7]) || 0;
    if (!close || close <= 0 || isNaN(close)) continue;
    results.push({
      symbol: fromStooq(p[0]),
      regularMarketPrice: close,
      regularMarketChange: parseFloat((close - open).toFixed(3)),
      regularMarketChangePercent: parseFloat(((close - open) / open * 100).toFixed(2)),
      regularMarketVolume: vol,
      regularMarketPreviousClose: open,
      marketCap: null,
    });
  }
  return results;
}

exports.handler = async function (event) {
  const symbols = (event.queryStringParameters?.symbols || "").split(",").filter(Boolean);
  if (!symbols.length) {
    return { statusCode: 400, body: JSON.stringify({ error: "no symbols" }) };
  }

  const allResults = [];

  // Stooq: נתוני מניות בקבוצות של 15
  const stockSyms  = symbols.filter(s => s !== "USDILS=X");
  const BATCH = 15;
  for (let i = 0; i < stockSyms.length; i += BATCH) {
    const batch = stockSyms.slice(i, i + BATCH);
    const stooqSyms = batch.map(toStooq).join(",");
    const url = `https://stooq.com/q/l/?s=${stooqSyms}&f=sd2t2ohlcv&h&e=csv`;
    try {
      const csv = await httpsGet(url);
      if (csv.includes(",")) allResults.push(...parseCSV(csv));
    } catch (e) {
      console.error("Stooq error:", e.message);
    }
    if (i + BATCH < stockSyms.length) await new Promise(r => setTimeout(r, 300));
  }

  // שער דולר/שקל
  if (symbols.includes("USDILS=X")) {
    try {
      const raw  = await httpsGet("https://open.er-api.com/v6/latest/USD");
      const data = JSON.parse(raw);
      const rate = data?.rates?.ILS;
      if (rate) {
        allResults.push({
          symbol: "USDILS=X",
          regularMarketPrice: rate,
          regularMarketChange: 0,
          regularMarketChangePercent: 0,
          regularMarketVolume: 0,
          regularMarketPreviousClose: rate,
          marketCap: null,
        });
      }
    } catch (e) {
      console.error("FX error:", e.message);
    }
  }

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache",
    },
    body: JSON.stringify({ quoteResponse: { result: allResults } }),
  };
};
