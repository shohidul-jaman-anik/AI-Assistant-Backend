// src/stockIntelligence/intent/intentDetector.js
// Pattern-based intent detection for stocks, forex, and options.
// Each rule is self-contained — add new intents without touching other files.

// ── Known company names → ticker ──────────────────────────────────────────

const COMPANY_TICKERS = {
  apple: 'AAPL', tesla: 'TSLA', microsoft: 'MSFT', google: 'GOOGL',
  alphabet: 'GOOGL', amazon: 'AMZN', nvidia: 'NVDA', meta: 'META',
  facebook: 'META', netflix: 'NFLX', uber: 'UBER', airbnb: 'ABNB',
  shopify: 'SHOP', paypal: 'PYPL', disney: 'DIS', boeing: 'BA',
  'johnson & johnson': 'JNJ', 'johnson and johnson': 'JNJ',
  'jp morgan': 'JPM', jpmorgan: 'JPM', 'bank of america': 'BAC',
  goldman: 'GS', 'goldman sachs': 'GS', 'morgan stanley': 'MS',
  visa: 'V', mastercard: 'MA', amd: 'AMD', intel: 'INTC',
  qualcomm: 'QCOM', ibm: 'IBM', oracle: 'ORCL', salesforce: 'CRM',
  adobe: 'ADBE', zoom: 'ZM', twitter: 'X', 'exxon mobil': 'XOM',
  chevron: 'CVX', pfizer: 'PFE', moderna: 'MRNA',
  berkshire: 'BRK.A', 'coca-cola': 'KO', coke: 'KO', pepsi: 'PEP',
  walmart: 'WMT', costco: 'COST', target: 'TGT', 'home depot': 'HD',
  mcdonalds: 'MCD', starbucks: 'SBUX', nike: 'NKE',
  'general electric': 'GE', ge: 'GE', arm: 'ARM', palantir: 'PLTR',
  snowflake: 'SNOW', crowdstrike: 'CRWD', datadog: 'DDOG',
  spotify: 'SPOT', lyft: 'LYFT', coinbase: 'COIN',
  'taiwan semiconductor': 'TSM', tsmc: 'TSM', 'asml': 'ASML',
};

// ── Currency codes & names ────────────────────────────────────────────────

const CURRENCY_CODES = new Set([
  'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD',
  'CNY', 'HKD', 'SGD', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK',
  'HUF', 'MXN', 'BRL', 'ZAR', 'INR', 'KRW', 'TRY', 'BDT',
]);

const CURRENCY_NAMES = {
  dollar: 'USD', 'us dollar': 'USD', 'american dollar': 'USD',
  euro: 'EUR', euros: 'EUR', pound: 'GBP', 'british pound': 'GBP',
  sterling: 'GBP', yen: 'JPY', 'japanese yen': 'JPY',
  'swiss franc': 'CHF', franc: 'CHF', 'canadian dollar': 'CAD',
  'australian dollar': 'AUD', 'new zealand dollar': 'NZD',
  yuan: 'CNY', renminbi: 'CNY', 'hong kong dollar': 'HKD',
  'singapore dollar': 'SGD', 'indian rupee': 'INR', rupee: 'INR',
  'korean won': 'KRW', won: 'KRW', 'turkish lira': 'TRY', lira: 'TRY',
  'south african rand': 'ZAR', rand: 'ZAR', taka: 'BDT',
};

// ── Helpers ───────────────────────────────────────────────────────────────

// Common English words that look like tickers — never treat as ticker symbols
const STOP_WORDS = new Set([
  'I', 'A', 'AN', 'AT', 'IN', 'IS', 'IT', 'TO', 'OF', 'OR',
  'BE', 'BY', 'DO', 'GO', 'HE', 'ME', 'MY', 'NO', 'ON',
  'SO', 'UP', 'US', 'WE', 'AM', 'AS', 'IF',
]);

function extractTicker(prompt) {
  const lower = prompt.toLowerCase();

  // 1. Named company lookup (longest match first for ambiguity)
  const sortedNames = Object.keys(COMPANY_TICKERS).sort((a, b) => b.length - a.length);
  for (const name of sortedNames) {
    if (lower.includes(name)) return COMPANY_TICKERS[name];
  }

  // 2. $TICKER notation — most explicit
  const dollarTicker = prompt.match(/\$([A-Z]{1,5})\b/);
  if (dollarTicker) return dollarTicker[1];

  // 3. ALL-CAPS standalone word (not a stop word)
  const standaloneTicker = prompt.match(/\b([A-Z]{2,5})\b/);
  if (standaloneTicker && !STOP_WORDS.has(standaloneTicker[1])) {
    return standaloneTicker[1];
  }

  return null;
}

function extractCurrencyPair(prompt) {
  const lower = prompt.toLowerCase();
  const upper = prompt.toUpperCase();

  // 1. Explicit pair: USD/EUR, USD-EUR, USDEUR
  const pairSlash = upper.match(/\b([A-Z]{3})[\/\-]([A-Z]{3})\b/);
  if (pairSlash) {
    const [, from, to] = pairSlash;
    if (CURRENCY_CODES.has(from) || CURRENCY_CODES.has(to)) return { from, to };
  }

  const pairConcat = upper.match(/\b([A-Z]{3})([A-Z]{3})\b/);
  if (pairConcat) {
    const [, from, to] = pairConcat;
    if (CURRENCY_CODES.has(from) && CURRENCY_CODES.has(to)) return { from, to };
  }

  // 2. "X to Y" phrasing
  const toMatch = lower.match(/([a-z\s]+?)\s+to\s+([a-z\s]+)/);
  if (toMatch) {
    const from = resolveCurrency(toMatch[1].trim());
    const to   = resolveCurrency(toMatch[2].trim());
    if (from && to) return { from, to };
    if (from)       return { from, to: 'USD' };
  }

  // 3. Named currencies scanned from prompt
  const found = [];
  for (const [name, code] of Object.entries(CURRENCY_NAMES)) {
    if (lower.includes(name) && !found.includes(code)) found.push(code);
  }
  for (const code of (upper.match(/\b([A-Z]{3})\b/g) ?? [])) {
    if (CURRENCY_CODES.has(code) && !found.includes(code)) found.push(code);
  }

  if (found.length >= 2) return { from: found[0], to: found[1] };
  if (found.length === 1) return { from: found[0], to: found[0] === 'USD' ? 'EUR' : 'USD' };

  return { from: 'USD', to: 'EUR' };
}

function resolveCurrency(text) {
  const upper = text.toUpperCase().trim();
  if (CURRENCY_CODES.has(upper)) return upper;
  return CURRENCY_NAMES[text.toLowerCase().trim()] ?? null;
}

function extractAmount(prompt) {
  const match = prompt.match(/[\d,]+(\.\d+)?/);
  return match ? parseFloat(match[0].replace(/,/g, '')) : 1;
}

function extractOptionsParams(prompt) {
  const ticker = extractTicker(prompt);
  const lower  = prompt.toLowerCase();

  // Contract type
  let contract_type = null;
  if (/\bcall(s)?\b/.test(lower))      contract_type = 'call';
  else if (/\bput(s)?\b/.test(lower))  contract_type = 'put';

  // Expiration date YYYY-MM-DD
  const dateMatch      = prompt.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  const expiration_date = dateMatch?.[1] ?? null;

  // Strike price
  const strikeMatch  = prompt.match(/\$?(\d{1,5}(?:\.\d+)?)\s*(?:strike|call|put)?/i);
  const strike_price = strikeMatch ? parseFloat(strikeMatch[1]) : null;

  // Polygon contract ticker  O:AAPL231215C00150000
  const contractMatch  = prompt.match(/\bO:[A-Z]{1,6}\d{6}[CP]\d{8}\b/);

  return { ticker, contract_type, expiration_date, strike_price, contractTicker: contractMatch?.[0] ?? null };
}

// ── Intent Registry ────────────────────────────────────────────────────────

const INTENT_REGISTRY = [

  // ── Stock Price (real-time snapshot) ──────────────────────────────────────
  {
    intent:   'STOCK_PRICE',
    provider: 'polygon',
    priority: 10,
    patterns: [
      /\b(current|live|real.?time|today'?s?|now|latest|right now)\b.*\b(price|quote|value|worth|trading|stock)\b/i,
      /\b(stock|share|equity)\b.*\b(price|quote|value|cost)\b/i,
      /\b(price|quote|value|worth)\b.*\b(stock|share|equity)\b/i,
      /\bhow much\b.*\b(stock|share|trading)\b/i,
      /\bwhat is\b.*\b(trading|priced|valued|worth)\b/i,
      /\b(aapl|tsla|msft|goog|amzn|nvda|meta|nflx|uber|abnb|shop|pltr|coin|snow)\b/i,
    ],
    extractor: (prompt) => ({ ticker: extractTicker(prompt) }),
  },

  // ── Stock OHLC / Historical ───────────────────────────────────────────────
  {
    intent:   'STOCK_OHLC',
    provider: 'polygon',
    priority: 8,
    patterns: [
      /\b(ohlc|open|high|low|close|candlestick|bar|chart|historical|history|performance)\b/i,
      /\b(last|past)\s+\d+\s+(day|week|month|year)s?\b/i,
      /\b(week|month|year|ytd|52.week)\b.*\b(performance|return|trend)\b/i,
      /\b(trend|trending|momentum|chart)\b/i,
    ],
    extractor: (prompt) => {
      const ticker = extractTicker(prompt);
      let timespan = 'day';
      if (/\b(hour|hourly|1h|4h)\b/i.test(prompt))        timespan = 'hour';
      else if (/\b(week|weekly)\b/i.test(prompt))          timespan = 'week';
      else if (/\b(month|monthly)\b/i.test(prompt))        timespan = 'month';
      return { ticker, timespan };
    },
  },

  // ── Stock Fundamentals / Details ──────────────────────────────────────────
  {
    intent:   'STOCK_DETAILS',
    provider: 'polygon',
    priority: 6,
    patterns: [
      /\b(fundamental|revenue|earnings|eps|dividend|financial|balance sheet|income|profit|loss|pe ratio|market cap|employees)\b/i,
      /\b(tell me about|describe|overview|profile|info about)\b.*\b(company|stock|share)\b/i,
      /\b(what company|who owns|founded|headquarters)\b/i,
    ],
    extractor: (prompt) => ({ ticker: extractTicker(prompt) }),
  },

  // ── Forex Rate ────────────────────────────────────────────────────────────
  {
    intent:   'FOREX',
    provider: 'polygon',
    priority: 10,
    patterns: [
      /\b(forex|fx|foreign exchange|currency|exchange rate|currency pair)\b/i,
      /\b(usd|eur|gbp|jpy|chf|cad|aud|nzd|cny)\b.*\b(to|vs|versus|rate|price|value)\b/i,
      /\b(dollar|euro|pound|yen|franc|rupee|yuan|taka)\b.*\b(to|vs|exchange|rate|worth)\b/i,
      /\b[A-Z]{3}\/[A-Z]{3}\b/,
      /\bexchange rate\b/i,
    ],
    exclude:  /\b(bitcoin|ethereum|btc|eth|crypto|cryptocurrency)\b/i,
    extractor: (prompt) => extractCurrencyPair(prompt),
  },

  // ── Forex Conversion ──────────────────────────────────────────────────────
  {
    intent:   'FOREX_CONVERSION',
    provider: 'polygon',
    priority: 9,
    patterns: [
      /\bconvert\b.*\b(dollar|euro|pound|yen|usd|eur|gbp|jpy|bdt)\b/i,
      /\b\d+\s*(dollar|euro|pound|yen|usd|eur|gbp|jpy|cad|aud|bdt)\b.*\b(to|in|into)\b/i,
      /\bhow much.*worth\b.*\b(in|as)\b/i,
      /\bhow many\b.*\b(dollar|euro|pound|yen)\b/i,
    ],
    exclude:  /\b(bitcoin|ethereum|btc|eth|crypto)\b/i,
    extractor: (prompt) => ({ ...extractCurrencyPair(prompt), amount: extractAmount(prompt) }),
  },

  // ── Options Chain ─────────────────────────────────────────────────────────
  {
    intent:   'OPTIONS_CHAIN',
    provider: 'polygon',
    priority: 10,
    patterns: [
      /\boptions?\b.*\b(chain|contract|call|put|strike|expir|greeks|iv|theta|delta|gamma|vega)\b/i,
      /\b(call|put)\b.*\boptions?\b/i,
      /\b(options chain|option chain|options market)\b/i,
      /\b(implied volatility|iv|greeks|theta|delta|vega|gamma)\b.*\boptions?\b/i,
    ],
    extractor: (prompt) => {
      const { ticker, contract_type, expiration_date, strike_price } = extractOptionsParams(prompt);
      return { ticker, contract_type, expiration_date, strike_price };
    },
  },

  // ── Single Options Contract ───────────────────────────────────────────────
  {
    intent:   'OPTIONS_CONTRACT',
    provider: 'polygon',
    priority: 11, // highest — very specific
    patterns: [
      /\bO:[A-Z]{1,6}\d{6}[CP]\d{8}\b/,
    ],
    extractor: (prompt) => {
      const { contractTicker } = extractOptionsParams(prompt);
      return { contractTicker };
    },
  },
];

// ── Main detector ──────────────────────────────────────────────────────────

/**
 * Detect all intents in a prompt.
 * Returns an array sorted by priority (highest first), capped at 3 intents.
 *
 * @param {string} prompt
 * @returns {{ intent: string, provider: string, params: object, priority: number }[]}
 */
export function detectIntent(prompt) {
  const matches = [];

  for (const def of INTENT_REGISTRY) {
    if (def.exclude?.test(prompt)) continue;
    if (!def.patterns.some((p) => p.test(prompt))) continue;

    // De-duplicate same intent, keep higher priority
    const existing = matches.find((m) => m.intent === def.intent);
    if (existing) {
      if (def.priority > existing.priority) matches.splice(matches.indexOf(existing), 1);
      else continue;
    }

    const params = def.extractor(prompt);
    matches.push({ intent: def.intent, provider: def.provider, params, priority: def.priority });
  }

  return matches
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3);
}

/**
 * Quick check — does this prompt need any live market data?
 * @param {string} prompt
 * @returns {boolean}
 */
export function requiresLiveData(prompt) {
  return detectIntent(prompt).length > 0;
}