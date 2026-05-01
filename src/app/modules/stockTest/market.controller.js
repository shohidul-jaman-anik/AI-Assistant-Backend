// controllers/market.controller.js
import {
  getMarketData,
  analyzeMarket,
} from "./market.service.js";

// PRICE CONTROLLER
export const getPrice = async (req, res) => {
  try {
    const { type, symbol, from, to } = req.query;

    const data = await getMarketData(type, symbol, { from, to });

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ANALYSIS CONTROLLER
export const getAnalysis = async (req, res) => {
  try {
    const { symbol, priceData } = req.body;

    const result = await analyzeMarket(symbol, priceData);

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};