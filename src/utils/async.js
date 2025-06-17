import path from 'path';
import fs from 'fs/promises'
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function importStockJSON(sym) {
  let jsonData;
  try {
    const filePath = path.join(`./src/db/bars/${sym}.json`)
    const fileContent = await fs.readFile(filePath, "utf-8");
    jsonData = JSON.parse(fileContent);
  } catch (e) {
    console.log(e.message);
    console.warn(`⚠️ File not found`);
    jsonData = {};
  }

  return jsonData;
}