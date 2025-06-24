import asyncHandler from "../utils/utils.asyncHandler.js";
import { getMultipleBars, updateHistoricalBars } from "../utils/utils.data_provider.js";
import { getCovarienceFromBarData, getCovarienceMatrix } from "../utils/utils.data_provider.js";

export const getCovarienceMatrixController = asyncHandler(async (req, res) => {
  try {
    const symbols = req.query.symbols;

    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({ error: "Query param 'symbols' must be an array." });
    }

    // Ensure symbol's latest data is up-to-date
    // This will update the historical bars for each symbol
    await getMultipleBars(symbols);

    const covMat = await getCovarienceMatrix(symbols);

    res.status(200).json({
      success: true,
      data: covMat,
    });

  } catch (error) {
    res.status(500).json({ error: "Failed to fetch covariance matrix." });
  }
});

export const getCovarienceFromSymbolController = asyncHandler(async (req, res) => {
    try{
        const symbol1 = req.query.symbol1;
        const symbol2 = req.query.symbol2;
        if(!symbol1 || !symbol2){
            return res.status(400).json({ error: "Query params 'symbol1' and 'symbol2' are mandatory."})
        }
        // Ensure both symbols have their latest data up-to-date
        await getMultipleBars([symbol1, symbol2]);

        // Fetch covariance between the two symbols
        // This will fetch the covariance from Redis cache or Alpaca data
        // and save it to Redis for future requests
        // If the data is not available in Redis, it will fetch from Alpaca API
        // and save it to Redis for future requests

        const cov = await getCovarienceFromBarData(symbol1, symbol2);

        res.status(200).json({
            success: true,
            data: cov,
        })
    }catch(error){
        res.status(500).json({ error: "Failed to fetch covariance." });
    }
})

