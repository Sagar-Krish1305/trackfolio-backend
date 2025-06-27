import asyncHandler from "../utils/utils.asyncHandler.js";
import { getMultipleBars } from "../utils/utils.data_provider.js";
import { getHoldingsFromAlpaca, getPastYearData } from "../utils/utils.user_portfolio.js";

export const getUserHoldingsController = asyncHandler(async (req, res) => {
  const { apiKey, secretKey } = req.params;
    if (!apiKey || !secretKey) {
        return res.status(400).json({ error: "API key and Secret key are required." });
    }
    try {
        const holdings = await getHoldingsFromAlpaca(apiKey, secretKey);
        if (holdings.length === 0) {
            return res.status(404).json({ error: "No holdings found or error fetching holdings." });
        }
        res.status(200).json(holdings);
    }
    catch (error) {
        console.error("Error fetching holdings:", error.message);
        res.status(500).json({ error: "Internal server error while fetching holdings." });
    }
});

export const getPastOneYearPortfolioValueController = asyncHandler(async (req, res) => {
    console.log("API HITTED")
  const { portfolio } = req.body;

  if (!portfolio || typeof portfolio !== 'object' || Object.keys(portfolio).length === 0) {
    return res.status(400).json({ error: "Portfolio data is required and must be a non-empty object." });
  }

  const symbols = Object.keys(portfolio);
  if (symbols.length === 0) {
    return res.status(400).json({ error: "Portfolio must contain at least one symbol." });
  }

  // Ensure latest bar data
  await getMultipleBars(symbols);

  const symbolDataMap = {};
  for (const [symbol, { shares, buyPrice }] of Object.entries(portfolio)) {
    const data = await getPastYearData(symbol); // returns { date: bar }
    symbolDataMap[symbol] = { shares, buyPrice, data };
  }

  // Get list of all dates from reference symbol
  const referenceSymbol = symbols[0];
  const referenceDates = Object.keys(symbolDataMap[referenceSymbol].data).sort(); // ensure chronological order

  const result = referenceDates.map(date => {
    let totalValue = 0;
    let totalCost = 0;

    for (const [symbol, { shares, buyPrice, data }] of Object.entries(symbolDataMap)) {
      const bar = data[date];
      const price = bar?.c ?? 0;
      totalValue += shares * price;
      totalCost += shares * buyPrice;
    }

    return {
      date,
      value: Number(totalValue.toFixed(2)),
      cost: Number(totalCost.toFixed(2)),
      unrealizedProfit: Number((totalValue - totalCost).toFixed(2)),
    };
  });

  res.status(200).json(result);
});

export async function getUserPortfolioController(req, res) {
    try {
        const { apiKey, secretKey } = req.params;
        if (!apiKey || !secretKey) {
            return res.status(400).json({ error: "API key and Secret key are required." });
        }
        const holdings = await getHoldingsFromAlpaca(apiKey, secretKey);
        if (holdings.length === 0) {
            return res.status(404).json({ error: "No holdings found or error fetching holdings." });
        }
        const portfolio = {};
        for (const holding of holdings) {
            const { symbol, qty, marketValue, company } = holding;
            portfolio[symbol] = {
                shares: parseFloat(qty),
                buyPrice: parseFloat(marketValue) / parseFloat(qty),
                company: company,
            };
        }
        res.status(200).json(portfolio);
    } catch (error) {
        console.error("Error fetching user portfolio:", error.message);
        res.status(500).json({ error: "Internal server error while fetching portfolio." });
    }
}

