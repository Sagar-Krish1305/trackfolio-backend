import asyncHandler from "../utils/asyncHandler.js";
import { getCovarienceFromBarData, getCovarienceMatrix } from "../utils/utils.js";

export const getCovarienceMatrixController = asyncHandler(async (req, res) => {
  try {
    const symbols = req.query.symbols;

    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({ error: "Query param 'symbols' must be an array." });
    }

    const covMat = await getCovarienceMatrix(symbols);

    res.status(200).json({
      success: true,
      data: covMat,
    });

  } catch (error) {
    res.status(500).json({ error: "Failed to fetch covariance matrix." });
  }
});

export const getCovarienceFromSymbol = asyncHandler(async (req, res) => {
    try{
        const symbol1 = req.query.symbol1;
        const symbol2 = req.query.symbol2;
        if(!symbol1 || !symbol2){
            return res.status(400).json({ error: "Query params 'symbol1' and 'symbol2' are mandatory."})
        }
        const cov = await getCovarienceFromBarData(symbol1, symbol2);

        res.status(200).json({
            success: true,
            data: cov,
        })
    }catch(error){
        res.status(500).json({ error: "Failed to fetch covariance." });
    }
})