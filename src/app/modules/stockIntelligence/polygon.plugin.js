// src/stockIntelligence/plugins/polygon.plugin.js
// Polygon.io — Stocks, Forex, Options
//
// KEY FIX: Multi-source fallback chain so prices always resolve:
//   /v2/last/trade (dedicated) → snapshot.lastTrade → snapshot.day.c → prevClose
// This works during market hours AND outside them.

import NodeCache from 'node-cache';

const BASE = 'https://api.polygon.io';

// TTL cache: live prices 5s, OHLC 30s, fundamentals 1h, news 60s
const cache = new NodeCache({ stdTTL: 5, checkperiod: 10 });

// ── Core fetch with retry + cache ─────────────────────────────────────────

async function pFetch(path, params = {}, ttl = 5) {
  const key = process.env.POLYGON_API_KEY;
  if (!key) throw new Error('POLYGON_API_KEY is not set in environment variables');

  const cacheKey = `${path}::${JSON.stringify(params)}`;
  const hit = cache.get(cacheKey);
  if (hit !== undefined) return hit;

  const url = new URL(`${BASE}${path}`);
  url.searchParams.set('apiKey', key);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }

  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url.toString(), {
        headers: { 'User-Agent': 'StockIntelligence/1.0' },
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        if (res.status === 429 || res.status >= 500) {
          lastErr = new Error(`Polygon ${res.status} on ${path}: ${body.slice(0, 200)}`);
          await sleep(200 * Math.pow(2, attempt + 1));
          continue;
        }
        throw new Error(`Polygon ${res.status} on ${path}: ${body.slice(0, 200)}`);
      }

      const data = await res.json();
      cache.set(cacheKey, data, ttl);
      return data;
    } catch (err) {
      lastErr = err;
      if (attempt < 2) await sleep(150 * Math.pow(2, attempt + 1));
    }
  }
  throw lastErr;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Formatters ────────────────────────────────────────────────────────────

const fmt    = (n, d = 2) => n != null ? Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : 'N/A';
const fmtUSD = (n)        => n != null ? `$${fmt(n)}` : 'N/A';
const fmtPct = (n)        => n != null ? `${n >= 0 ? '+' : ''}${fmt(n)}%` : 'N/A';
const fmtVol = (n)        => n != null ? Number(n).toLocaleString() : 'N/A';

// ── Plugin ────────────────────────────────────────────────────────────────

export class PolygonPlugin {
  get name()        { return 'polygon'; }
  get description() { return 'Polygon.io — real-time US stocks, forex (FX rates/conversion), options (chain, Greeks, IV)'; }

  async isAvailable() {
    try { await pFetch('/v2/aggs/ticker/AAPL/prev', {}, 60); return true; }
    catch { return false; }
  }

  async fetchData(intent, params) {
    switch (intent) {
      case 'STOCK_PRICE':      return this.#stockSnapshot(params);
      case 'STOCK_OHLC':       return this.#stockOHLC(params);
      case 'STOCK_DETAILS':    return this.#stockDetails(params);
      case 'FOREX':            return this.#forexSnapshot(params);
      case 'FOREX_CONVERSION': return this.#forexConversion(params);
      case 'OPTIONS_CHAIN':    return this.#optionsChain(params);
      case 'OPTIONS_CONTRACT': return this.#optionsContract(params);
      default: throw new Error(`PolygonPlugin: unknown intent "${intent}"`);
    }
  }

  // ── STOCKS ────────────────────────────────────────────────────────────────

  async #stockSnapshot({ ticker }) {
    if (!ticker) throw new Error('ticker is required for STOCK_PRICE');
    const t = ticker.toUpperCase();

    // Fetch all sources in parallel
    const [snapRes, prevRes, lastTradeRes, lastQuoteRes, detailsRes, newsRes] =
      await Promise.allSettled([
        pFetch(`/v2/snapshot/locale/us/markets/stocks/tickers/${t}`, {}, 5),
        pFetch(`/v2/aggs/ticker/${t}/prev`, {}, 30),
        pFetch(`/v2/last/trade/${t}`, {}, 5),       // dedicated last trade — works after hours
        pFetch(`/v2/last/nbbo/${t}`, {}, 5),         // dedicated last quote (bid/ask)
        pFetch(`/v3/reference/tickers/${t}`, {}, 3600),
        pFetch('/v2/reference/news', { ticker: t, limit: 3 }, 60),
      ]);

    const snapshot   = snapRes.status      === 'fulfilled' ? snapRes.value      : null;
    const prevClose  = prevRes.status      === 'fulfilled' ? prevRes.value      : null;
    const lastTrade  = lastTradeRes.status === 'fulfilled' ? lastTradeRes.value : null;
    const lastQuote  = lastQuoteRes.status === 'fulfilled' ? lastQuoteRes.value : null;
    const details    = detailsRes.status   === 'fulfilled' ? detailsRes.value   : null;
    const recentNews = newsRes.status      === 'fulfilled' ? newsRes.value      : null;

    const snapTicker = snapshot?.ticker;
    const day        = snapTicker?.day;
    const prevResult = prevClose?.results?.[0];

    // /v2/last/trade  → { results: { p: price, t: timestamp_ns } }
    const ltPrice = lastTrade?.results?.p;
    const ltTime  = lastTrade?.results?.t;  // nanoseconds

    // /v2/last/nbbo   → { results: { P: ask, p: bid } }
    const askPrice = lastQuote?.results?.P;
    const bidPrice = lastQuote?.results?.p;

    // Snapshot embedded last trade
    const snapLtPrice = snapTicker?.lastTrade?.p;
    const snapLtTime  = snapTicker?.lastTrade?.t;

    // ── Best-effort price resolution ──────────────────────────────────────
    let lastPrice   = null;
    let priceSource = 'none';
    let isLive      = false;

    if (ltPrice != null) {
      lastPrice   = ltPrice;
      priceSource = 'last_trade_endpoint';
      // ltTime in nanoseconds — live if within 30 min
      isLive = ltTime ? (Date.now() - ltTime / 1_000_000) < 1_800_000 : true;
    } else if (snapLtPrice != null) {
      lastPrice   = snapLtPrice;
      priceSource = 'snapshot_last_trade';
      const ts    = snapLtTime;
      isLive      = ts ? (Date.now() - (ts > 1e12 ? ts : ts * 1000)) < 1_800_000 : false;
    } else if (day?.c != null) {
      lastPrice   = day.c;
      priceSource = 'day_close';
      isLive      = false;
    } else if (askPrice != null) {
      lastPrice   = askPrice;
      priceSource = 'last_quote_ask';
      isLive      = false;
    } else if (prevResult?.c != null) {
      lastPrice   = prevResult.c;
      priceSource = 'prev_close';
      isLive      = false;
    }

    return {
      intent: 'STOCK_PRICE', ticker: t,
      snapshot, prevClose, lastTrade, lastQuote, details, recentNews,
      lastPrice, priceSource, isLive,
      fetchedAt: new Date().toISOString(),
    };
  }

  async #stockOHLC({ ticker, from, to, timespan = 'day', multiplier = 1 }) {
    if (!ticker) throw new Error('ticker is required for STOCK_OHLC');
    const t         = ticker.toUpperCase();
    const endDate   = to   ?? new Date().toISOString().slice(0, 10);
    const startDate = from ?? (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); })();
    const data = await pFetch(
      `/v2/aggs/ticker/${t}/range/${multiplier}/${timespan}/${startDate}/${endDate}`,
      { adjusted: true, sort: 'desc', limit: 50 }, 30
    );
    return { intent: 'STOCK_OHLC', ticker: t, timespan, from: startDate, to: endDate, data, fetchedAt: new Date().toISOString() };
  }

  async #stockDetails({ ticker }) {
    if (!ticker) throw new Error('ticker is required for STOCK_DETAILS');
    const t = ticker.toUpperCase();
    const [detailsRes, financialsRes, dividendsRes] = await Promise.allSettled([
      pFetch(`/v3/reference/tickers/${t}`, {}, 3600),
      pFetch('/vX/reference/financials', { ticker: t, limit: 4 }, 3600),
      pFetch('/v3/reference/dividends', { ticker: t, limit: 5 }, 3600),
    ]);
    return {
      intent:     'STOCK_DETAILS', ticker: t,
      details:    detailsRes.status    === 'fulfilled' ? detailsRes.value    : null,
      financials: financialsRes.status === 'fulfilled' ? financialsRes.value : null,
      dividends:  dividendsRes.status  === 'fulfilled' ? dividendsRes.value  : null,
      fetchedAt:  new Date().toISOString(),
    };
  }

  // ── FOREX ─────────────────────────────────────────────────────────────────

  async #forexSnapshot({ from = 'USD', to = 'EUR' }) {
    const f    = from.toUpperCase();
    const t2   = to.toUpperCase();
    const pair = `C:${f}${t2}`;
    const [snapRes, prevRes, convRes] = await Promise.allSettled([
      pFetch(`/v2/snapshot/locale/global/markets/forex/tickers/${pair}`, {}, 5),
      pFetch(`/v2/aggs/ticker/${pair}/prev`, {}, 30),
      pFetch(`/v1/conversion/${f}/${t2}`, { amount: 1, precision: 6 }, 5),
    ]);
    return {
      intent: 'FOREX', from: f, to: t2, pair,
      snapshot:   snapRes.status === 'fulfilled' ? snapRes.value  : null,
      prevClose:  prevRes.status === 'fulfilled' ? prevRes.value  : null,
      conversion: convRes.status === 'fulfilled' ? convRes.value  : null,
      fetchedAt:  new Date().toISOString(),
    };
  }

  async #forexConversion({ from = 'USD', to = 'EUR', amount = 1 }) {
    const f  = from.toUpperCase();
    const t2 = to.toUpperCase();
    const data = await pFetch(`/v1/conversion/${f}/${t2}`, { amount: Number(amount), precision: 6 }, 5);
    return { intent: 'FOREX_CONVERSION', from: f, to: t2, amount: Number(amount), data, fetchedAt: new Date().toISOString() };
  }

  // ── OPTIONS ───────────────────────────────────────────────────────────────

  async #optionsChain({ ticker, expiration_date, strike_price, contract_type, limit = 20 }) {
    if (!ticker) throw new Error('ticker is required for OPTIONS_CHAIN');
    const t = ticker.toUpperCase();
    const chainParams = {
      underlying_ticker: t, limit, sort: 'expiration_date', order: 'asc',
      ...(expiration_date && { expiration_date }),
      ...(strike_price    && { strike_price }),
      ...(contract_type   && { contract_type: contract_type.toLowerCase() }),
    };
    const [chainRes, underlyingRes] = await Promise.allSettled([
      pFetch('/v3/reference/options/contracts', chainParams, 30),
      pFetch(`/v2/snapshot/locale/us/markets/stocks/tickers/${t}`, {}, 5),
    ]);
    const chain      = chainRes.status      === 'fulfilled' ? chainRes.value      : null;
    const underlying = underlyingRes.status === 'fulfilled' ? underlyingRes.value : null;
    let contractSnapshots = null;
    if (chain?.results?.length > 0) {
      const snapResults = await Promise.allSettled(
        chain.results.slice(0, 10).map((c) =>
          pFetch(`/v3/snapshot/options/${t}/${encodeURIComponent(c.ticker)}`, {}, 30)
        )
      );
      contractSnapshots = snapResults
        .filter((r) => r.status === 'fulfilled')
        .map((r) => r.value?.results ?? null);
    }
    return {
      intent: 'OPTIONS_CHAIN', ticker: t,
      filters: { expiration_date, strike_price, contract_type },
      chain, underlying, contractSnapshots,
      fetchedAt: new Date().toISOString(),
    };
  }

  async #optionsContract({ contractTicker }) {
    if (!contractTicker) throw new Error('contractTicker is required for OPTIONS_CONTRACT');
    const underlying = contractTicker.match(/^O:([A-Z]{1,6})/)?.[1] ?? '';
    const [detailsRes, snapshotRes] = await Promise.allSettled([
      pFetch(`/v3/reference/options/contracts/${encodeURIComponent(contractTicker)}`, {}, 60),
      pFetch(`/v3/snapshot/options/${underlying}/${encodeURIComponent(contractTicker)}`, {}, 15),
    ]);
    return {
      intent: 'OPTIONS_CONTRACT', contractTicker,
      details:  detailsRes.status  === 'fulfilled' ? detailsRes.value  : null,
      snapshot: snapshotRes.status === 'fulfilled' ? snapshotRes.value : null,
      fetchedAt: new Date().toISOString(),
    };
  }

  // ── CONTEXT FORMATTERS ────────────────────────────────────────────────────

  formatContext(data, intent) {
    switch (intent) {
      case 'STOCK_PRICE':      return this.#fmtStockSnapshot(data);
      case 'STOCK_OHLC':       return this.#fmtOHLC(data);
      case 'STOCK_DETAILS':    return this.#fmtStockDetails(data);
      case 'FOREX':            return this.#fmtForex(data);
      case 'FOREX_CONVERSION': return this.#fmtForexConversion(data);
      case 'OPTIONS_CHAIN':    return this.#fmtOptionsChain(data);
      case 'OPTIONS_CONTRACT': return this.#fmtOptionsContract(data);
      default: return `[Polygon Data]\n${JSON.stringify(data, null, 2)}`;
    }
  }

  #fmtStockSnapshot(data) {
    const { ticker, snapshot, prevClose, lastTrade, lastQuote, details, recentNews, lastPrice, priceSource, isLive, fetchedAt } = data;
    const snapTicker = snapshot?.ticker;
    const day        = snapTicker?.day;
    const ref        = details?.results;
    const news       = recentNews?.results ?? [];
    const prevResult = prevClose?.results?.[0];
    const bidPrice   = lastQuote?.results?.p;
    const askPrice   = lastQuote?.results?.P;

    const lines = [`╔══ STOCK PRICE: ${ticker} ══ ${fetchedAt} ══╗`];
    if (!isLive) lines.push(`ℹ Source: ${priceSource.replace(/_/g, ' ')} (market closed or delayed data)`);
    if (ref) {
      lines.push(`Company    : ${ref.name ?? ticker}`);
      lines.push(`Exchange   : ${ref.primary_exchange ?? 'N/A'}`);
      lines.push(`Market Cap : ${fmtUSD(ref.market_cap)}`);
    }
    lines.push('──────────────────────────────────────');
    lines.push(lastPrice != null
      ? `★ PRICE    : ${fmtUSD(lastPrice)}`
      : `★ PRICE    : UNAVAILABLE — Polygon returned no price for ${ticker}`
    );
    if (snapTicker) {
      lines.push(`Day Change : ${fmtPct(snapTicker.todaysChangePerc)} (${fmtUSD(snapTicker.todaysChange)})`);
      lines.push(`Open       : ${fmtUSD(day?.o)}  High: ${fmtUSD(day?.h)}  Low: ${fmtUSD(day?.l)}`);
      lines.push(`Day Close  : ${fmtUSD(day?.c)}`);
      lines.push(`Volume     : ${fmtVol(day?.v)}`);
      lines.push(`VWAP       : ${fmtUSD(day?.vw)}`);
    }
    if (bidPrice != null || askPrice != null) lines.push(`Bid / Ask  : ${fmtUSD(bidPrice)} / ${fmtUSD(askPrice)}`);
    if (prevResult) lines.push(`Prev Close : ${fmtUSD(prevResult.c)}   Prev Vol: ${fmtVol(prevResult.v)}`);
    if (news.length > 0) {
      lines.push('──────── Recent News ────────');
      news.forEach((n, i) => lines.push(`${i + 1}. [${(n.published_utc ?? '').slice(0, 10)}] ${n.title}`));
    }
    lines.push(`╚══ Source: Polygon.io ══╝`);
    // Structured block for precise LLM grounding
    lines.push('\n[STRUCTURED_PRICE_DATA]');
    lines.push(JSON.stringify({
      ticker, price: lastPrice, priceSource, isLive,
      dayOpen: day?.o ?? null, dayHigh: day?.h ?? null, dayLow: day?.l ?? null, dayClose: day?.c ?? null,
      prevClose: prevResult?.c ?? null,
      changeAmt: snapTicker?.todaysChange ?? null, changePct: snapTicker?.todaysChangePerc ?? null,
      volume: day?.v ?? null, bidPrice, askPrice, fetchedAt,
    }));
    return lines.join('\n');
  }

  #fmtOHLC(data) {
    const { ticker, timespan, from, to, data: ohlc, fetchedAt } = data;
    const results = ohlc?.results ?? [];
    const lines = [
      `╔══ OHLC: ${ticker} (${timespan}) ${from} → ${to} ══ ${fetchedAt} ══╗`,
      `Date         Open       High       Low        Close      Volume`,
      '─'.repeat(72),
    ];
    results.slice(0, 20).forEach((r) => {
      const date = new Date(r.t).toISOString().slice(0, 10);
      lines.push(`${date}   ${fmt(r.o).padEnd(11)}${fmt(r.h).padEnd(11)}${fmt(r.l).padEnd(11)}${fmt(r.c).padEnd(11)}${fmtVol(r.v)}`);
    });
    lines.push(`╚══ ${results.length} bars returned ══╝`);
    return lines.join('\n');
  }

  #fmtStockDetails(data) {
    const { ticker, details, financials, dividends, fetchedAt } = data;
    const ref  = details?.results;
    const fins = financials?.results ?? [];
    const divs = dividends?.results  ?? [];
    const lines = [`╔══ STOCK DETAILS: ${ticker} ══ ${fetchedAt} ══╗`];
    if (ref) {
      lines.push(`Name       : ${ref.name}`);
      lines.push(`Exchange   : ${ref.primary_exchange}   Type: ${ref.type}`);
      lines.push(`Market Cap : ${fmtUSD(ref.market_cap)}`);
      lines.push(`Employees  : ${ref.total_employees?.toLocaleString() ?? 'N/A'}`);
      lines.push(`Sector     : ${ref.sic_description ?? 'N/A'}`);
    }
    if (fins.length > 0) {
      lines.push('──────── Financials ────────');
      fins.slice(0, 2).forEach((f) => {
        const fi = f.financials?.income_statement;
        const bs = f.financials?.balance_sheet;
        lines.push(`Period: ${f.fiscal_year} ${f.fiscal_period}`);
        if (fi) {
          lines.push(`  Revenue   : ${fmtUSD(fi.revenues?.value)}`);
          lines.push(`  Net Income: ${fmtUSD(fi.net_income_loss?.value)}`);
          lines.push(`  EPS       : ${fmtUSD(fi.basic_earnings_per_share?.value)}`);
        }
        if (bs) lines.push(`  Assets    : ${fmtUSD(bs.assets?.value)}`);
      });
    }
    if (divs.length > 0) {
      lines.push('──────── Dividends ────────');
      divs.slice(0, 3).forEach((d) => lines.push(`  ${d.ex_dividend_date}: ${fmtUSD(d.cash_amount)}`));
    }
    lines.push(`╚══ Source: Polygon.io Reference API ══╝`);
    return lines.join('\n');
  }

  #fmtForex(data) {
    const { from, to, pair, snapshot, prevClose, conversion, fetchedAt } = data;
    const snap    = snapshot?.ticker;
    const day     = snap?.day;
    const prev    = prevClose?.results?.[0];
    const liveRate = conversion?.last?.ask ?? conversion?.converted;
    const displayRate = liveRate ?? day?.c;
    const lines = [
      `╔══ FOREX: ${from}/${to} ══ ${fetchedAt} ══╗`,
      `★ RATE    : ${displayRate != null ? fmt(displayRate, 6) : 'N/A'} ${to} per 1 ${from}`,
      `Day OHLC  : ${fmt(day?.o, 6)} / ${fmt(day?.h, 6)} / ${fmt(day?.l, 6)} / ${fmt(day?.c, 6)}`,
      `Change    : ${fmtPct(snap?.todaysChangePerc)}`,
    ];
    if (prev) lines.push(`Prev Close: ${fmt(prev.c, 6)}`);
    if (conversion?.converted) lines.push(`1 ${from} = ${fmt(conversion.converted, 6)} ${to}  (real-time)`);
    lines.push(`╚══ Source: Polygon.io Forex API ══╝`);
    return lines.join('\n');
  }

  #fmtForexConversion(data) {
    const { from, to, amount, data: conv, fetchedAt } = data;
    const converted = conv?.converted;
    const rate      = conv?.last?.ask ?? conv?.last?.bid;
    return [
      `╔══ FOREX CONVERSION ══ ${fetchedAt} ══╗`,
      `Convert  : ${amount.toLocaleString()} ${from}  →  ${to}`,
      `★ RESULT : ${converted != null ? fmt(converted, 4) : 'N/A'} ${to}`,
      `Rate     : 1 ${from} = ${rate != null ? fmt(rate, 6) : 'N/A'} ${to}`,
      `Spread   : bid ${fmt(conv?.last?.bid, 6)}  |  ask ${fmt(conv?.last?.ask, 6)}`,
      `╚══ Source: Polygon.io ══╝`,
    ].join('\n');
  }

  #fmtOptionsChain(data) {
    const { ticker, filters, chain, underlying, contractSnapshots, fetchedAt } = data;
    const results    = chain?.results ?? [];
    const underSnap  = underlying?.ticker;
    const underPrice = underSnap?.lastTrade?.p ?? underSnap?.day?.c;
    const lines = [`╔══ OPTIONS CHAIN: ${ticker} ══ ${fetchedAt} ══╗`];
    if (underPrice != null) lines.push(`Underlying : ${fmtUSD(underPrice)}`);
    if (filters.contract_type) lines.push(`Type       : ${filters.contract_type.toUpperCase()}`);
    lines.push('─'.repeat(88));
    lines.push(`${'Ticker'.padEnd(26)} ${'Expiry'.padEnd(12)} ${'Type'.padEnd(7)} ${'Strike'.padEnd(10)} ${'OI'.padEnd(10)} IV`);
    lines.push('─'.repeat(88));
    results.slice(0, 15).forEach((c, i) => {
      const snap = contractSnapshots?.[i];
      const g    = snap?.greeks;
      lines.push(`${(c.ticker ?? '').padEnd(26)} ${(c.expiration_date ?? '').padEnd(12)} ${(c.contract_type?.toUpperCase() ?? '').padEnd(7)} ${fmtUSD(c.strike_price).padEnd(10)} ${fmtVol(snap?.open_interest).padEnd(10)} ${snap?.implied_volatility != null ? fmtPct(snap.implied_volatility * 100) : 'N/A'}`);
      if (g) lines.push(`  Δ ${fmt(g.delta, 4)}  Γ ${fmt(g.gamma, 5)}  Θ ${fmt(g.theta, 4)}  V ${fmt(g.vega, 4)}`);
    });
    lines.push(`╚══ ${results.length} contracts found ══╝`);
    return lines.join('\n');
  }

  #fmtOptionsContract(data) {
    const { contractTicker, details, snapshot, fetchedAt } = data;
    const d    = details?.results;
    const snap = snapshot?.results;
    const g    = snap?.greeks;
    const lines = [`╔══ OPTIONS CONTRACT: ${contractTicker} ══ ${fetchedAt} ══╗`];
    if (d) {
      lines.push(`Underlying : ${d.underlying_ticker}`);
      lines.push(`Type       : ${d.contract_type?.toUpperCase()}   Strike: ${fmtUSD(d.strike_price)}`);
      lines.push(`Expiration : ${d.expiration_date}   Style: ${d.exercise_style}`);
    }
    if (snap) {
      lines.push('──────── Market ────────');
      lines.push(`Price      : ${fmtUSD(snap.last_quote?.ask ?? snap.value)}`);
      lines.push(`Bid / Ask  : ${fmtUSD(snap.last_quote?.bid)} / ${fmtUSD(snap.last_quote?.ask)}`);
      lines.push(`OI / Vol   : ${fmtVol(snap.open_interest)} / ${fmtVol(snap.day?.volume)}`);
      lines.push(`IV         : ${snap.implied_volatility != null ? fmtPct(snap.implied_volatility * 100) : 'N/A'}`);
    }
    if (g) {
      lines.push('──────── Greeks ────────');
      lines.push(`Δ ${fmt(g.delta, 4)}  Γ ${fmt(g.gamma, 5)}  Θ ${fmt(g.theta, 4)}  V ${fmt(g.vega, 4)}`);
      lines.push(`  Delta: moves $${fmt(Math.abs(g.delta ?? 0), 2)} per $1 in ${d?.underlying_ticker ?? 'underlying'}`);
      lines.push(`  Theta: loses $${fmt(Math.abs(g.theta ?? 0), 4)}/day from time decay`);
      lines.push(`  Vega:  changes $${fmt(Math.abs(g.vega ?? 0), 4)} per 1% change in IV`);
    }
    lines.push(`╚══ Source: Polygon.io Options API ══╝`);
    return lines.join('\n');
  }
}