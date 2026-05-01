export const resolvePrice = (data) => {
  if (!data) return null;

  const price =
    data.lastTradePrice ??
    data.lastPrice ??
    data.close ??
    data.prevClose ??
    data.open ??
    null;

  if (!price) return null;

  return {
    price,
    open: data.open ?? null,
    high: data.high ?? null,
    low: data.low ?? null,
    close: data.close ?? data.prevClose ?? null,
    sourceUsed: "best_available_fallback",
  };
};