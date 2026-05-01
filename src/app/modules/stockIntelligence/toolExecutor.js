// src/stockIntelligence/tools/toolExecutor.js
// Executes data plugins in parallel for all detected intents.

import { pluginRegistry } from './pluginRegistry.js';

/**
 * Execute all detected intents against their providers in parallel.
 *
 * @param {Array<{intent: string, provider: string, params: object}>} detectedIntents
 * @returns {Promise<{
 *   contextBlocks: string[],
 *   snapshots: object[],
 *   errors: string[]
 * }>}
 */
export async function executeTools(detectedIntents) {
  if (!detectedIntents?.length) {
    return { contextBlocks: [], snapshots: [], errors: [] };
  }

  const results = await Promise.allSettled(
    detectedIntents.map(({ intent, provider, params }) =>
      executeSingle(intent, provider, params)
    )
  );

  const contextBlocks = [];
  const snapshots = [];
  const errors = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const { intent, provider, params } = detectedIntents[i];

    if (result.status === 'fulfilled') {
      contextBlocks.push(result.value.contextString);
      snapshots.push({
        provider,
        intent,
        ticker: params.ticker || params.from || null,
        rawData: result.value.raw,
        contextBlock: result.value.contextString,
        fetchedAt: new Date(),
        fetchDurationMs: result.value.durationMs,
      });
    } else {
      const msg = `[${intent}/${provider} failed: ${result.reason?.message || 'unknown'}]`;
      errors.push(msg);
      console.error('[ToolExecutor]', msg, result.reason);
    }
  }

  return { contextBlocks, snapshots, errors };
}

async function executeSingle(intent, provider, params) {
  const start = Date.now();

  if (!pluginRegistry.has(provider)) {
    throw new Error(`No plugin registered for: "${provider}"`);
  }

  const plugin = pluginRegistry.get(provider);
  console.log(
    `[ToolExecutor] ${intent} via ${provider}`,
    JSON.stringify(params)
  );

  const raw = await plugin.fetchData(intent, params);
  const contextString = plugin.formatContext(raw, intent, params);
  // Small preview log to help debugging when answers disagree with live data
  console.log(
    `[ToolExecutor] Context preview for ${intent}/${provider}: ${String(contextString).slice(0, 240).replace(/\n/g, ' ')}...`
  );
  const durationMs = Date.now() - start;

  console.log(`[ToolExecutor] ${intent} completed in ${durationMs}ms`);
  return { contextString, raw, durationMs };
}
