import asyncHandler from "../utils/utils.asyncHandler.js";
import { getLatestStockPrice } from "../utils/utils.data_provider.js";

export const getLatestPriceOfSymbolController = asyncHandler(async (req, res) => {
  const { symbol } = req.params;

  if (!symbol) {
    return res.status(400).json({ error: "Symbol is required." });
  }

  try {
    // Fetch the latest price from your data source (e.g., database, API)
    // This is a placeholder; replace with actual data fetching logic
    const latestPrice = await getLatestStockPrice(symbol);

    if (!latestPrice) {
      return res.status(404).json({ error: "Symbol not found or no price available." });
    }

    res.status(200).json({ symbol, latestPrice });
  } catch (error) {
    console.error("Error fetching latest price:", error.message);
    res.status(500).json({ error: "Internal server error while fetching latest price." });
  }
});