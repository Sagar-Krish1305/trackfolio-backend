import { redis } from "../config/redisConfig.js";
import { importStockJSON } from "../utils/async.js";
import { getLogReturnsFromBarJSON } from "../utils/maths.js";
import { calculateCovarience } from "../utils/maths.js";
import fs from "fs/promises";
import path from "path";
import dayjs from "dayjs";
import axios from "axios";
import { sleep } from "../utils/async.js";
import pLimit from "p-limit";

const LAST_UPDATED_PATH = path.join("./src/db/last_updated/last_updated.json");
let lastUpdatedMap = {};
try {
  const file = await fs.readFile(LAST_UPDATED_PATH, "utf-8");
  lastUpdatedMap = JSON.parse(file);
} catch (e) {
  console.log(e.message);
  console.warn("❌ Couldn't read last_updated.json. Please Try Again.");
  process.exit(1);
}

export async function getCovarienceFromBarData(sym1, sym2) {
  const redisKey = `cov:${sym1}-${sym2}`;
  const reverseKey = `cov:${sym2}-${sym1}`;

  // 1. Try fetching from Redis
  const cached = await redis.get(redisKey);
  if (cached !== null) {
    return parseFloat(cached);
  }

  // 2. If not in Redis, compute it
  const jsonSym1 = await importStockJSON(sym1);
  const jsonSym2 = await importStockJSON(sym2);

  const log_return1 = getLogReturnsFromBarJSON(jsonSym1);
  const log_return2 = getLogReturnsFromBarJSON(jsonSym2);

  const cov = calculateCovarience(log_return1, log_return2);
  // 3. Save to Redis (both directions)
  await redis.set(redisKey, cov);
  await redis.set(reverseKey, cov);

  return cov;
}

export async function getCovarienceMatrix(symbols) {
  let covMat = [];
  for (let i = 0; i < symbols.length; i++) {
    covMat[i] = [];
    for (let j = 0; j < symbols.length; j++) {
      covMat[i][j] = await getCovarienceFromBarData(symbols[i], symbols[j]);
    }
  }
  return covMat;
}

const STOCK_SYMBOLS_PATH = path.join(
  "./src/db/stock_symbols/stock_symbols.json"
);
const CONCURRENCY_LIMIT = 5;
const limit = pLimit(CONCURRENCY_LIMIT);

export async function getMultipleBars(symbols) {
  const tasks = symbols.map((sym, idx) =>
    limit(async () => {
      if (idx % 500 === 0) {
        console.log(`Data Set Up Completed for ${idx} Stocks`);
      }
      await getHistoricalBars(sym, 5);
    })
  );
  await Promise.all(tasks);
}

export async function getHistoricalBars(symbol, retries = 3) {
  let startDate;
  const lastDate = lastUpdatedMap[symbol];

  if (lastDate) {
    // Add 1 day to avoid duplicate last saved entry
    startDate = dayjs(lastDate).add(1, "day").toISOString();
  } else {
    // fetch from 800 days back
    startDate = dayjs().subtract(800, "day").toISOString();
  }

  // Same date as today
  const isSameDate = dayjs(startDate).isSame(dayjs().toISOString(), 'day');
  if(isSameDate) return;

  try {
    const response = await axios.get(
      `https://data.alpaca.markets/v2/stocks/${symbol}/bars`,
      {
        params: {
          timeframe: "1Day",
          start: startDate,
          limit: 1000,
        },
        headers: {
          "APCA-API-KEY-ID": process.env.ALPACA_API_KEY,
          "APCA-API-SECRET-KEY": process.env.ALPACA_SECRET_KEY,
        },
      }
    );

    const newBars = response.data.bars || [];
    if (newBars.length === 0) {
    //   console.warn(`⚠️ No new bars for ${symbol}`);
      return [];
    }

    // Load existing bars from disk if any
    const barsPath = path.join("./src/db/bars", `${symbol}.json`);
    let existingBars = [];
    try {
      const existingData = await fs.readFile(barsPath, "utf-8");
      existingBars = JSON.parse(existingData);
    } catch {
      // no file found, that's okay
    }

    const combined = [...existingBars, ...newBars];
    if (combined.length < 500) {
    //   console.warn(`⚠️ Not enough bars for ${symbol}`);
      return [];
    }
    const trimmed = combined.slice(-500); // keep only last 500

    // Save updated bars
    await fs.mkdir(path.dirname(barsPath), { recursive: true });
    await fs.writeFile(barsPath, JSON.stringify(trimmed, null, 2));

    // Update last updated date
    const latestDate = newBars[newBars.length - 1].t;
    lastUpdatedMap[symbol] = latestDate;
    await fs.writeFile(
      LAST_UPDATED_PATH,
      JSON.stringify(lastUpdatedMap, null, 2)
    );

    // console.log(`✅ Updated ${symbol}. Total bars: ${trimmed.length}`);
    return trimmed;
  } catch (error) {
    if (error.response?.status === 429 && retries > 0) {
    //   console.warn(`⛔ Rate limit hit for ${symbol}. Retrying in 10s...`);
      await sleep(10000);
      return getHistoricalBars(symbol, retries - 1);
    } else {
      console.error(`❌ Failed to fetch bars for ${symbol}: ${error.message}`);
      return null;
    }
  }
}

export async function setUpDatabase() {
  const file = await fs.readFile(STOCK_SYMBOLS_PATH, "utf-8");
  let jsonData = JSON.parse(file);
  const symbols = jsonData.symbols;

  await getMultipleBars(symbols);
  console.log(`Data Set Up Completed for All Stocks ✅`);
}
