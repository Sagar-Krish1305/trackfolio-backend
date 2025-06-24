import { redis } from "../config/redisConfig.js";
import { importStockJSON } from "./utils.async.js";
import { getLogReturnsFromBarJSON } from "./utils.maths.js";
import { calculateCovarience } from "./utils.maths.js";
import fs from "fs/promises";
import path from "path";
import dayjs from "dayjs";
import axios from "axios";
import { sleep } from "./utils.async.js";
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

  // getting only Values array
  const valuesSym1 = Object.values(jsonSym1);
  const valuesSym2 = Object.values(jsonSym2);

  const log_return1 = getLogReturnsFromBarJSON(valuesSym1);
  const log_return2 = getLogReturnsFromBarJSON(valuesSym2);

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
      console.log(`🔄 Updating historical bars for ${sym}`);
      await updateHistoricalBars(sym, 5);
    })
  );
  await Promise.all(tasks);
}

export async function updateHistoricalBars(symbol, retries = 3) {
  let startDate;
  const lastDate = lastUpdatedMap[symbol];

  if (lastDate) {
    // Avoid duplicate by starting from the next day
    startDate = dayjs(lastDate).add(1, "day").toISOString();
  } else {
    // fetch from 800 days back
    startDate = dayjs().subtract(800, "day").toISOString();
  }

  const isSameDate = dayjs(startDate).isSame(dayjs(), "day");
  if (isSameDate) return;

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
    if (newBars.length === 0) return {};

    const barsPath = path.join("./src/db/bars", `${symbol}.json`);
    let existingBars = {};
    try {
      const existingData = await fs.readFile(barsPath, "utf-8");
      existingBars = JSON.parse(existingData);
    } catch {
      // no file found, start fresh
    }

    // Merge existing and new bars (date as key)
    for (const bar of newBars) {
      const date = dayjs(bar.t).format("YYYY-MM-DD");
      existingBars[date] = bar;
    }

    const sortedDates = Object.keys(existingBars).sort();
    const trimmedDates = sortedDates.slice(-500); // Keep only last 500 dates

    const trimmedBars = {};
    for (const date of trimmedDates) {
      trimmedBars[date] = existingBars[date];
    }

    await fs.mkdir(path.dirname(barsPath), { recursive: true });
    await fs.writeFile(barsPath, JSON.stringify(trimmedBars, null, 2));

    const latestDate = newBars[newBars.length - 1].t;
    lastUpdatedMap[symbol] = latestDate;
    await fs.writeFile(LAST_UPDATED_PATH, JSON.stringify(lastUpdatedMap, null, 2));

    return trimmedBars;
  } catch (error) {
    if (error.response?.status === 429 && retries > 0) {
      await sleep(10000);
      return updateHistoricalBars(symbol, retries - 1);
    } else {
      console.error(`❌ Failed to fetch bars for ${symbol}: ${error.message}`);
      return null;
    }
  }
}

