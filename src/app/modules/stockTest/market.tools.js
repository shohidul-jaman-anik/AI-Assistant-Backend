// tools/market.tool.js
import axios from "axios";

const POLYGON_API = process.env.POLYGON_API_KEY;

// STOCK
export const fetchStock = async (symbol) => {
  try {
    const res = await axios.get(
      `https://api.polygon.io/v2/last/trade/${symbol}?apiKey=${POLYGON_API}`
    );

    return {
      lastTradePrice: res.data.results?.p,
      high: null,
      low: null,
      open: null,
      close: null,
    };
  } catch (err) {
    return null;
  }
};

// FOREX
export const fetchForex = async (from, to) => {
  try {
    const res = await axios.get(
      `https://api.polygon.io/v1/conversion/${from}/${to}?apiKey=${POLYGON_API}`
    );

    return {
      lastPrice: res.data.converted,
    };
  } catch (err) {
    return null;
  }
};

// OPTIONS (simplified)
export const fetchOptions = async (symbol) => {
  try {
    const res = await axios.get(
      `https://api.polygon.io/v3/reference/options/contracts?underlying_ticker=${symbol}&apiKey=${POLYGON_API}`
    );

    return {
      lastPrice: res.data.results?.[0]?.last_price,
    };
  } catch (err) {
    return null;
  }
};