import express from "express";
import { redis } from "./src/config/redisConfig.js";
// import cron from "node-cron";
import {
  getCovarienceFromSymbolController,
  getCovarienceMatrixController,
} from "./src/controllers/covarience.controller.js";

// Config Enviorment Variables
import dotenv from "dotenv";
import { getPastOneYearPortfolioValueController, getUserHoldingsController } from "./src/controllers/user_portfolio.controller.js";
import { getLatestPriceOfSymbolController } from "./src/controllers/bars.controller.js";

dotenv.config();

const app = express();
app.use(express.json());
const PORT = 1305;

// let dbSetupLock = false;
// cron.schedule("0 10 * * *", async () => {
//   if (dbSetupLock === true) {
//     console.log("Already setting up data. Skipping this one.");
//   }
//   dbSetupLock = true;
//   await setUpDatabase();
//   dbSetupLock = false;
// });

// Connecting to Redis
try {
  console.log("...Connecting Redis ⚙️");
  await redis.connect();
  const keys = await redis.keys("cov:*");
  if (keys.length > 0) {
    await redis.del(...keys);
    console.log(`🧹 Deleted ${keys.length} cov:* keys`);
  } else {
    console.log("ℹ️ No cov:* keys found");
  }
} catch (e) {
  console.log("❌ Redis has not connect. Please try again.");
}

console.log("Setting Up Initial Route");
app.get("/intro", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Trackfolio – Portfolio-Risk Manager API Docs</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 40px;
      background-color: #0f172a;
      color: #e2e8f0;
    }
    h1 {
      color: #38bdf8;
      font-size: 2.5em;
      margin-bottom: 10px;
    }
    h2 {
      margin-top: 40px;
      font-size: 1.6em;
      color: #facc15;
    }
    details {
      background-color: #1e293b;
      border-left: 6px solid #38bdf8;
      border-radius: 6px;
      margin-bottom: 20px;
      padding: 14px 18px;
    }
    summary {
      cursor: pointer;
      font-size: 1.1em;
      font-weight: bold;
      color: #4ade80;
    }
    .path {
      font-family: monospace;
      font-size: 1em;
      display: block;
      margin: 6px 0;
      color: #f8fafc;
    }
    .desc {
      color: #cbd5e1;
      margin-top: 6px;
    }
    footer {
      margin-top: 60px;
      font-size: 0.9em;
      color: #94a3b8;
    }
    code {
      background-color: #334155;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <h1>📘 Trackfolio – Portfolio-Risk Manager API</h1>
  <p>This backend API allows you to analyze portfolio performance and risk, compute covariance, and access real-time market holdings using Alpaca.</p>

  <h2>📌 Available Endpoints</h2>

  <details open>
    <summary>GET /intro</summary>
    <span class="path">/intro</span>
    <p class="desc">Displays this documentation page.</p>
  </details>

  <details>
    <summary>GET /covarience-matrix</summary>
    <span class="path">/covarience-matrix?symbols=AAPL,GOOG,MSFT</span>
    <p class="desc">Returns the covariance matrix for the given stock symbols.</p>
    <p><strong>Query Params:</strong></p>
    <ul>
      <li><code>symbols</code> (required): Comma-separated list of stock symbols.</li>
    </ul>
  </details>

  <details>
    <summary>GET /covarience-from-symbol</summary>
    <span class="path">/covarience-from-symbol?symbol1=AAPL&symbol2=MSFT</span>
    <p class="desc">Returns pairwise covariance between two specific stocks.</p>
    <p><strong>Query Params:</strong></p>
    <ul>
      <li><code>symbol1</code> (required): First stock symbol.</li>
      <li><code>symbol2</code> (required): Second stock symbol.</li>
    </ul>
  </details>

  <details>
    <summary>GET /get-holdings/:apiKey/:secretKey</summary>
    <span class="path">/get-holdings/&lt;apiKey&gt;/&lt;secretKey&gt;</span>
    <p class="desc">Fetches holdings of a user using Alpaca Paper API keys.</p>
    <p><strong>Route Params:</strong></p>
    <ul>
      <li><code>apiKey</code> (required): Alpaca API Key ID</li>
      <li><code>secretKey</code> (required): Alpaca Secret Key</li>
    </ul>
  </details>

  <details>
    <summary>GET /get-past-year-portfolio-value</summary>
    <span class="path">/get-past-year-portfolio-value</span>
    <p class="desc">Returns past 1 year of portfolio value based on user-defined holdings and buy prices.</p>
    <p><strong>Request Type:</strong> <code>POST</code></p>
    <p><strong>Request Body:</strong> <code>application/json</code></p>
    <pre><code>{
  "portfolio": {
    "AAPL": { "shares": 10, "buyPrice": 120 },
    "MSFT": { "shares": 5, "buyPrice": 300 }
  }
}</code></pre>
    <p><strong>Response:</strong> Array of objects with <code>date</code>, <code>value</code>, <code>cost</code>, and <code>unrealizedProfit</code>.</p>
  </details>

  <h2>⚙️ Technologies Used</h2>
  <ul>
    <li>Node.js + Express.js</li>
    <li>Redis (for fast matrix caching)</li>
    <li>Alpaca API (market + portfolio data)</li>
    <li>Docker (for deployment)</li>
  </ul>

  <footer>
    🔗 Created with 💙 by <strong>Krish & Uday</strong> — Trackfolio Backend Team
  </footer>
</body>
</html>
`);
});

app.get("/covarience-matrix", getCovarienceMatrixController);
app.get("/covarience-from-symbol", getCovarienceFromSymbolController);
app.get("/get-holdings/:apiKey/:secretKey", getUserHoldingsController);
app.post("/get-past-year-portfolio-value", getPastOneYearPortfolioValueController);
app.get("/get-latest-price/:symbol", getLatestPriceOfSymbolController);

app.listen(PORT, function () {
  console.log(`Listning to Docker Image at PORT: ${PORT}`);
});
