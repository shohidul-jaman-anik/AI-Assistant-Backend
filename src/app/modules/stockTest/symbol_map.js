export const normalizeSymbol = (input) => {
  const map = {
    "airbnb": "ABNB",
    "apple": "AAPL",
    "tesla": "TSLA",
    "google": "GOOGL",
    "microsoft": "MSFT",
  };

  return map[input.toLowerCase()] || input.toUpperCase();
};