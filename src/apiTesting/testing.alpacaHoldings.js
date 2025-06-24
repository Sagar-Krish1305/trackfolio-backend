
import dotenv from "dotenv";
import { getHoldingsFromAlpaca } from "../utils/utils.user_portfolio.js";
dotenv.config();
const apiKey = process.env.ALPACA_API_KEY;
const secretKey = process.env.ALPACA_SECRET_KEY;

console.log("apiKey:", apiKey);
console.log("secretKey:", secretKey);

console.log("Fetching Alpaca Holdings...");
const alpacaHoldings = await getHoldingsFromAlpaca(apiKey, secretKey);
if (alpacaHoldings.length === 0) {
  console.log("❌ No holdings found or error fetching holdings.");
} else {
  console.log("✅ Alpaca Holdings Fetched Successfully:");
    console.log(alpacaHoldings);
}
console.log("Alpaca Holdings Fetching Completed.");