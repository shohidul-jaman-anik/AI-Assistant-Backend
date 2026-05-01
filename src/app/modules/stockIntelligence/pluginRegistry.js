// src/stockIntelligence/plugins/pluginRegistry.js
// Registers all data-provider plugins. To add a new provider:
//   1. Create a class implementing { name, description, isAvailable(), fetchData(), formatContext() }
//   2. pluginRegistry.register(new YourPlugin())

import { PolygonPlugin } from './polygon.plugin.js';

class PluginRegistry {
  #plugins = new Map();

  register(plugin) {
    if (!plugin.name)                             throw new Error('Plugin must expose a name property');
    if (typeof plugin.fetchData      !== 'function') throw new Error(`Plugin "${plugin.name}" must implement fetchData()`);
    if (typeof plugin.formatContext  !== 'function') throw new Error(`Plugin "${plugin.name}" must implement formatContext()`);
    this.#plugins.set(plugin.name, plugin);
    return this; // chainable
  }

  get(name) {
    const p = this.#plugins.get(name);
    if (!p) throw new Error(`Plugin "${name}" not registered. Available: [${[...this.#plugins.keys()].join(', ')}]`);
    return p;
  }

  has(name)  { return this.#plugins.has(name); }
  list()     { return [...this.#plugins.values()].map((p) => ({ name: p.name, description: p.description })); }

  async healthCheck() {
    const results = {};
    for (const [name, plugin] of this.#plugins) {
      try {
        results[name] = (await plugin.isAvailable()) ? 'ok' : 'unavailable';
      } catch {
        results[name] = 'error';
      }
    }
    return results;
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────
export const pluginRegistry = new PluginRegistry();

// Polygon.io via @massive.com/client-js  (stocks + forex + options)
pluginRegistry.register(new PolygonPlugin());

// Future providers — uncomment to enable:
// pluginRegistry.register(new BinancePlugin());      // Crypto
// pluginRegistry.register(new AlphaVantagePlugin()); // Alternative fundamentals