import express from "express";
import { redis } from "./src/config/redisConfig.js";
import cron from "node-cron";
import {
  getCovarienceFromSymbol,
  getCovarienceMatrixController,
} from "./src/controllers/covarience.controller.js";
import { setUpDatabase } from "./src/utils/utils.js";

// Config Enviorment Variables
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 1305;

let dbSetupLock = false;
cron.schedule("0 10 * * *", async () => {
  if (dbSetupLock === true) {
    console.log("Already setting up data. Skipping this one.");
  }
  dbSetupLock = true;
  await setUpDatabase();
  dbSetupLock = false;
});

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
      .endpoint {
        margin-bottom: 25px;
        padding: 16px;
        background-color: #1e293b;
        border-left: 6px solid #38bdf8;
        border-radius: 6px;
      }
      .method {
        font-weight: bold;
        color: #4ade80;
      }
      .path {
        font-family: monospace;
        font-size: 1.1em;
      }
      .desc {
        display: block;
        margin-top: 6px;
        color: #cbd5e1;
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
        font-size: 0.95em;
      }
    </style>
  </head>
  <body>
    <h1>📘 Trackfolio – P-Risk Manager API</h1>
    <p>Use this backend API to analyze portfolio risk, fetch historical data, and compute covariance matrices efficiently using Redis caching.</p>

    <h2>📌 Endpoints</h2>

    <div class="endpoint">
      <span class="method">GET</span>
      <span class="path">/intro</span>
      <span class="desc">→ Displays this API documentation page.</span>
    </div>

    <div class="endpoint">
      <span class="method">GET</span>
      <span class="path">/covarience-matrix?symbols=AAPL,GOOG,MSFT</span>
      <span class="desc">→ Returns a covariance matrix for given comma-separated stock symbols.</span>
    </div>

    <div class="endpoint">
      <span class="method">GET</span>
      <span class="path">/covarience-from-symbol?symbol1=AAPL&symbol2=MSFT</span>
      <span class="desc">→ Returns the pairwise covariance between two specific stocks.</span>
    </div>

    <h2>⚙️ Technologies Used</h2>
    <ul>
      <li>Node.js + Express</li>
      <li>Redis (for fast cache access)</li>
      <li>Docker & Docker Compose</li>
      <li>Alpaca API (for market data)</li>
    </ul>

    <footer>
      🔗 Created with 💙 by <strong>Krish & Uday</strong> — Trackfolio Backend Team
    </footer>
  </body>
  </html>
`);
});

app.get("/covarience-matrix", getCovarienceMatrixController);
app.get("/covarience-from-symbol", getCovarienceFromSymbol);

app.listen(PORT, function () {
  console.log(`Listning to Docker Image at PORT: ${PORT}`);
});
