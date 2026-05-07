// netlify/functions/quotes.js
// Runs SERVER-SIDE on Netlify — no CORS issues, fetches Yahoo Finance directly

const https = require("https");

exports.handler = async function (event) {
  const symbols = event.queryStringParameters?.symbols || "";
  if (!symbols) {
    return { statusCode: 400, body: JSON.stringify({ error: "no symbols" }) };
  }

  const fields = [
    "regularMarketPrice",
    "regularMarketChange",
    "regularMarketChangePercent",
    "regularMarketVolume",
    "regularMarketPreviousClose",
    "marketCap",
    "shortName",
  ].join(",");

  const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&fields=${fields}`;

  return new Promise((resolve) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
          "Accept-Language": "en-US,en;q=0.9",
        },
        timeout: 10000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          resolve({
            statusCode: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "no-cache",
            },
            body: data,
          });
        });
      }
    );
    req.on("error", (err) => {
      resolve({
        statusCode: 500,
        body: JSON.stringify({ error: err.message }),
      });
    });
    req.on("timeout", () => {
      req.destroy();
      resolve({ statusCode: 408, body: JSON.stringify({ error: "timeout" }) });
    });
  });
};
