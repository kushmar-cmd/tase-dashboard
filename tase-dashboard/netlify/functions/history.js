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
  const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";
  const homeRes = await request({
    hostname: "finance.yahoo.com", path: "/", method: "GET",
    headers: { "User-Agent": UA, "Accept": "text/html,application/xhtml+xml,*/*", "Accept-Language": "en-US,en;q=0.5" },
  });
  const cookieStr = homeRes.cookies.map(c => c.split(";")[0]).filter(Boolean).join("; ");
  const crumbRes = await request({
    hostname: "query2.finance.yahoo.com", path: "/v1/test/getcrumb", method: "GET",
    headers: { "User-Agent": UA, "Cookie": cookieStr, "Accept": "*/*", "Referer": "https://finance.yahoo.com/" },
  });
  return { crumb: crumbRes.data.trim(), cookieStr };
}

exports.handler = async function (event) {
  const symbol   = event.queryStringParameters?.symbol;
  const range    = event.queryStringParameters?.range    || "3mo";
  const interval = event.queryStringParameters?.interval || "1d";

  if (!symbol) return { statusCode: 400, body: "no symbol" };

  try {
    const { crumb, cookieStr } = await getYahooCrumb();
    const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";

    const path = `/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&crumb=${encodeURIComponent(crumb)}&includePrePost=false`;

    const res = await request({
      hostname: "query2.finance.yahoo.com", path, method: "GET",
      headers: { "User-Agent": UA, "Cookie": cookieStr, "Accept": "application/json", "Referer": "https://finance.yahoo.com/" },
    });

    const parsed = JSON.parse(res.data);
    const result = parsed?.chart?.result?.[0];
    if (!result) throw new Error("אין נתונים היסטוריים");

    const { timestamp, indicators, meta } = result;
    const q = indicators?.quote?.[0] || {};

    const chartData = (timestamp || []).map((ts, i) => {
      const close = q.close?.[i];
      if (!close) return null;

      // Format date based on interval
      const d = new Date(ts * 1000);
      let dateLabel;
      if (interval === "1h" || interval === "15m") {
        dateLabel = d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });
      } else if (interval === "1wk" || interval === "1mo") {
        dateLabel = d.toLocaleDateString("he-IL", { month: "short", year: "2-digit" });
      } else {
        dateLabel = d.toLocaleDateString("he-IL", { day: "numeric", month: "numeric" });
      }

      return {
        date:      dateLabel,
        timestamp: ts,
        open:      q.open?.[i]   ? parseFloat(q.open[i].toFixed(3))   : null,
        high:      q.high?.[i]   ? parseFloat(q.high[i].toFixed(3))   : null,
        low:       q.low?.[i]    ? parseFloat(q.low[i].toFixed(3))    : null,
        close:     parseFloat(close.toFixed(3)),
        volume:    q.volume?.[i] || 0,
      };
    }).filter(Boolean);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ data: chartData, meta }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
