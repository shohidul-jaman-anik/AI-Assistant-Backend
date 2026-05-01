// services/market.service.js
import MarketQuery from "./market.model.js";
import { resolvePrice } from "./market.utils.js"
import {
  fetchStock,
  fetchForex,
  fetchOptions,
} from "./market.tools.js"


// ANALYSIS ENGINE (basic but extensible)
export const analyzeMarket = async (symbol, data) => {
  const analysis = {
    trend:
      data.price > data.open
        ? "Bullish 📈"
        : data.price < data.open
        ? "Bearish 📉"
        : "Sideways ➡️",

    volatility:
      data.high && data.low
        ? ((data.high - data.low) / data.price) * 100
        : null,

    recommendation:
      data.price > data.open ? "BUY bias" : "SELL / WAIT",
  };

  const response = { symbol, analysis };

  await MarketQuery.create({
    query: `analysis:${symbol}`,
    type: "analysis",
    symbol,
    response,
  });

  return response;
};

import { normalizeSymbol } from "./symbol_map.js";

export const getMarketData = async (type, symbol, extra = {}) => {
  const cleanSymbol = normalizeSymbol(symbol);

  let rawData = null;

  if (type === "stock") rawData = await fetchStock(cleanSymbol);
  if (type === "forex") rawData = await fetchForex(extra.from, extra.to);
  if (type === "options") rawData = await fetchOptions(cleanSymbol);

  const resolved = resolvePrice(rawData);

  // 🔥 IMPORTANT: force fallback response if empty
  const response = {
    symbol: cleanSymbol,
    type,
    price: resolved?.price || "unavailable",
    open: resolved?.open || null,
    high: resolved?.high || null,
    low: resolved?.low || null,
    close: resolved?.close || null,
    sourceUsed: resolved?.sourceUsed || "no-data",
    timestamp: new Date(),
  };

  await MarketQuery.create({
    query: `${type}:${cleanSymbol}`,
    type,
    symbol: cleanSymbol,
    response,
  });

  return response;
};