import axios from "axios";
import { importStockJSON } from "./utils.async.js";
export async function getHoldingsFromAlpaca(apiKey, apiSecret) {
  if (!apiKey || !apiSecret) {
    console.error("❌ Alpaca API credentials are missing.");
    return [];
  }
  try {
    const response = await axios.get(
      "https://paper-api.alpaca.markets/v2/positions",
      {
        headers: {
          "APCA-API-KEY-ID": apiKey,
          "APCA-API-SECRET-KEY": apiSecret,
        },
      }
    );
    return response.data.map((holding) => ({ // can have other properties as well
      symbol: holding.symbol,
      qty: parseFloat(holding.qty),
      marketValue: parseFloat(holding.market_value),
      company: holding.asset
    }));
  } catch (error) {
    console.error("❌ Error fetching holdings from Alpaca:", error.message);
    return [];
  }
}

export async function getPastYearData(symbol) {
  try {
    const allData = await importStockJSON(symbol); // JSON object, not array

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoISO = oneYearAgo.toISOString();

    // Filter based on date keys (object -> object)
    const pastYearData = Object.entries(allData)
      .filter(([date, _]) => date >= oneYearAgoISO)
      .reduce((acc, [date, bar]) => {
        acc[date] = bar;
        return acc;
      }, {});

    return pastYearData;
  } catch (err) {
    console.error(`Error fetching data for ${symbol}:`, err);
    return {};
  }
}







