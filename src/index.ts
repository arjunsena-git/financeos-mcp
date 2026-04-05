#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";

// ─── Server Definition ────────────────────────────────────────────────────────
const server = new Server(
  { name: "financeos-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function fetchJSON(url: string): Promise<any> {
  const res = await fetch(url, { headers: { "User-Agent": "FinanceOS-MCP/1.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

function fmt(n: number, d = 2): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

function arrow(n: number): string { return n >= 0 ? "🟢" : "🔴"; }

// ─── Tools List ───────────────────────────────────────────────────────────────
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_crypto_price",
      description: "Get live crypto price, 24h/7d change, market cap, volume and ATH. Supports Bitcoin, Ethereum, TAO (Bittensor) and 10,000+ coins via CoinGecko ID.",
      inputSchema: {
        type: "object",
        properties: {
          coin_id: { type: "string", description: "CoinGecko coin ID e.g. bitcoin, ethereum, bittensor, solana" },
          currency: { type: "string", description: "Display currency. Default: usd", default: "usd" },
        },
        required: ["coin_id"],
      },
    },
    {
      name: "get_multiple_crypto_prices",
      description: "Get live prices for multiple cryptocurrencies at once. Perfect for a portfolio snapshot.",
      inputSchema: {
        type: "object",
        properties: {
          coin_ids: { type: "string", description: "Comma-separated CoinGecko IDs e.g. bitcoin,ethereum,bittensor" },
          currency: { type: "string", description: "Display currency. Default: usd", default: "usd" },
        },
        required: ["coin_ids"],
      },
    },
    {
      name: "get_fear_greed_index",
      description: "Get the Crypto Fear & Greed Index (0=Extreme Fear, 100=Extreme Greed) with 7-day history and investment interpretation.",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    {
      name: "get_stock_quote",
      description: "Get a real-time stock quote. US stocks: AAPL, TSLA. Indian NSE stocks: RELIANCE.NS, TCS.NS, INFY.NS",
      inputSchema: {
        type: "object",
        properties: {
          symbol: { type: "string", description: "Stock ticker e.g. AAPL, RELIANCE.NS" },
        },
        required: ["symbol"],
      },
    },
    {
      name: "get_bittensor_stats",
      description: "Get live Bittensor (TAO) price, network stats and a breakdown of passive income options including staking yield.",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    {
      name: "get_portfolio_summary",
      description: "Calculate real-time P&L for a portfolio of crypto and/or stocks. Returns per-asset breakdown and total portfolio performance.",
      inputSchema: {
        type: "object",
        properties: {
          holdings: {
            type: "array",
            description: "List of holdings with asset ID, quantity and average buy price.",
            items: {
              type: "object",
              properties: {
                asset: { type: "string", description: "CoinGecko ID for crypto (e.g. bitcoin) or prefix stock: for stocks (e.g. stock:AAPL, stock:RELIANCE.NS)" },
                quantity: { type: "number", description: "Units held" },
                avg_buy_price: { type: "number", description: "Average buy price in USD" },
              },
              required: ["asset", "quantity", "avg_buy_price"],
            },
          },
        },
        required: ["holdings"],
      },
    },
    {
      name: "get_top_movers",
      description: "Get top gaining and losing cryptocurrencies in the last 24h from the top 100 by market cap.",
      inputSchema: {
        type: "object",
        properties: {
          limit: { type: "number", description: "How many gainers/losers to show. Default: 5", default: 5 },
        },
        required: [],
      },
    },
    {
      name: "get_global_crypto_market",
      description: "Get global crypto market overview: total market cap, BTC dominance, 24h volume and active coin count.",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
  ],
}));

// ─── Tool Handlers ────────────────────────────────────────────────────────────
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const now = new Date().toUTCString();

  try {
    switch (name) {

      case "get_crypto_price": {
        const id = (args?.coin_id as string).toLowerCase().trim();
        const cur = ((args?.currency as string) || "usd").toLowerCase();
        const d = await fetchJSON(`https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&community_data=false&developer_data=false`);
        const m = d.market_data;
        const price = m.current_price[cur];
        const c24 = m.price_change_percentage_24h;
        const c7 = m.price_change_percentage_7d;
        return {
          content: [{ type: "text", text:
`${arrow(c24)} **${d.name} (${d.symbol.toUpperCase()})** — Live Price

💰 **Price:** $${fmt(price)} ${cur.toUpperCase()}
📈 **24h:** ${c24 >= 0 ? "+" : ""}${c24?.toFixed(2)}%  |  📊 **7d:** ${c7 >= 0 ? "+" : ""}${c7?.toFixed(2)}%
🏦 **Market Cap:** $${fmt(m.market_cap[cur], 0)}
📦 **24h Volume:** $${fmt(m.total_volume[cur], 0)}
🏔️ **ATH:** $${fmt(m.ath[cur])} (${m.ath_change_percentage[cur]?.toFixed(1)}% from ATH)
🏅 **Rank:** #${d.market_cap_rank}

_CoinGecko · ${now}_` }],
        };
      }

      case "get_multiple_crypto_prices": {
        const ids = args?.coin_ids as string;
        const cur = ((args?.currency as string) || "usd").toLowerCase();
        const data = await fetchJSON(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${cur}&include_24hr_change=true&include_market_cap=true`);
        const lines = Object.entries(data).map(([coin, info]: [string, any]) => {
          const c = info[`${cur}_24h_change`];
          return `${arrow(c)} **${coin.toUpperCase()}** $${fmt(info[cur])} | 24h: ${c >= 0 ? "+" : ""}${c?.toFixed(2)}% | MCap: $${fmt(info[`${cur}_market_cap`], 0)}`;
        });
        return {
          content: [{ type: "text", text: `📊 **Live Prices** (${cur.toUpperCase()})\n\n${lines.join("\n")}\n\n_CoinGecko · ${now}_` }],
        };
      }

      case "get_fear_greed_index": {
        const data = await fetchJSON("https://api.alternative.me/fng/?limit=7");
        const cur = data.data[0];
        const v = parseInt(cur.value);
        const emoji = v >= 75 ? "🤑" : v >= 55 ? "😀" : v >= 45 ? "😐" : v >= 25 ? "😨" : "😱";
        const bar = "█".repeat(Math.floor(v / 5)) + "░".repeat(20 - Math.floor(v / 5));
        const hist = data.data.slice(1).map((d: any) =>
          `  ${new Date(parseInt(d.timestamp) * 1000).toLocaleDateString("en-US", { weekday: "short" })}: ${d.value} — ${d.value_classification}`
        ).join("\n");
        const tip = v < 30 ? "Market is fearful — historically a long-term buying opportunity." : v > 70 ? "Market is greedy — consider trimming or waiting for a pullback." : "Neutral sentiment — evaluate assets on individual merit.";
        return {
          content: [{ type: "text", text:
`${emoji} **Crypto Fear & Greed Index**

**${v}/100 — ${cur.value_classification}**
${bar} ${v}%

0–25 Extreme Fear | 25–45 Fear | 45–55 Neutral | 55–75 Greed | 75–100 Extreme Greed

📅 **Last 7 days:**
${hist}

💡 ${tip}

_Alternative.me · ${now}_` }],
        };
      }

      case "get_stock_quote": {
        const sym = (args?.symbol as string).toUpperCase().trim();
        const data = await fetchJSON(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`);
        const meta = data.chart.result[0].meta;
        const price = meta.regularMarketPrice;
        const prev = meta.chartPreviousClose;
        const chg = price - prev;
        const chgPct = (chg / prev) * 100;
        return {
          content: [{ type: "text", text:
`${arrow(chg)} **${sym}** — ${meta.exchangeName}

💰 **Price:** ${meta.currency} ${fmt(price)}
📈 **Change:** ${chg >= 0 ? "+" : ""}${fmt(chg)} (${chgPct >= 0 ? "+" : ""}${chgPct.toFixed(2)}%)
📊 **Prev Close:** ${meta.currency} ${fmt(prev)}
📅 **52W High:** ${meta.currency} ${fmt(meta.fiftyTwoWeekHigh)}
📉 **52W Low:** ${meta.currency} ${fmt(meta.fiftyTwoWeekLow)}

_Yahoo Finance · ${now}_` }],
        };
      }

      case "get_bittensor_stats": {
        const d = await fetchJSON("https://api.coingecko.com/api/v3/coins/bittensor?localization=false&tickers=false&community_data=false&developer_data=false");
        const m = d.market_data;
        const price = m.current_price.usd;
        const c24 = m.price_change_percentage_24h;
        const c7 = m.price_change_percentage_7d;
        return {
          content: [{ type: "text", text:
`🧠 **Bittensor (TAO) — Network & Price**

${arrow(c24)} **Price:** $${fmt(price)}
📈 **24h:** ${c24 >= 0 ? "+" : ""}${c24?.toFixed(2)}%  |  📊 **7d:** ${c7 >= 0 ? "+" : ""}${c7?.toFixed(2)}%
🏦 **Market Cap:** $${fmt(m.market_cap.usd, 0)}
📦 **24h Volume:** $${fmt(m.total_volume.usd, 0)}
🏔️ **ATH:** $${fmt(m.ath.usd)}  |  🏅 **Rank:** #${d.market_cap_rank}

🌐 **Network Snapshot:**
• 32+ active subnets, each a specialised AI task market
• Miners earn TAO by serving AI compute to subnets
• Validators stake TAO, rate miners, and earn emissions

💰 **Passive Income Options:**
1. **Stake TAO** with a validator → ~10–18% APY (variable)
2. **Run a subnet miner** → earn TAO for AI work
3. **Register your own subnet** → highest upside, needs capital + GPUs

🔗 Explorer: taostats.io

_CoinGecko · ${now}_` }],
        };
      }

      case "get_portfolio_summary": {
        const holdings = args?.holdings as Array<{ asset: string; quantity: number; avg_buy_price: number }>;
        const cryptoH = holdings.filter(h => !h.asset.startsWith("stock:"));
        const stockH = holdings.filter(h => h.asset.startsWith("stock:"));
        let totalCost = 0, totalValue = 0;
        const rows: string[] = [];

        if (cryptoH.length > 0) {
          const ids = cryptoH.map(h => h.asset).join(",");
          const prices = await fetchJSON(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
          for (const h of cryptoH) {
            const info = prices[h.asset];
            if (!info) continue;
            const curr = info.usd;
            const c24 = info.usd_24h_change;
            const cost = h.quantity * h.avg_buy_price;
            const val = h.quantity * curr;
            const pnl = val - cost;
            const pnlPct = (pnl / cost) * 100;
            totalCost += cost; totalValue += val;
            rows.push(`${arrow(pnl)} **${h.asset.toUpperCase()}** ×${h.quantity}\n   Buy $${fmt(h.avg_buy_price)} → Now $${fmt(curr)} | P&L: ${pnl >= 0 ? "+" : ""}$${fmt(Math.abs(pnl))} (${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(1)}%) | 24h: ${c24 >= 0 ? "+" : ""}${c24?.toFixed(2)}%`);
          }
        }

        for (const h of stockH) {
          const sym = h.asset.replace("stock:", "").toUpperCase();
          try {
            const data = await fetchJSON(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`);
            const meta = data.chart.result[0].meta;
            const curr = meta.regularMarketPrice;
            const prev = meta.chartPreviousClose;
            const c24 = ((curr - prev) / prev) * 100;
            const cost = h.quantity * h.avg_buy_price;
            const val = h.quantity * curr;
            const pnl = val - cost;
            const pnlPct = (pnl / cost) * 100;
            totalCost += cost; totalValue += val;
            rows.push(`${arrow(pnl)} **${sym}** ×${h.quantity}\n   Buy $${fmt(h.avg_buy_price)} → Now $${fmt(curr)} | P&L: ${pnl >= 0 ? "+" : ""}$${fmt(Math.abs(pnl))} (${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(1)}%) | 24h: ${c24 >= 0 ? "+" : ""}${c24?.toFixed(2)}%`);
          } catch { rows.push(`⚠️ **${sym}** — price unavailable`); }
        }

        const pnl = totalValue - totalCost;
        const pnlPct = (pnl / totalCost) * 100;
        return {
          content: [{ type: "text", text:
`💼 **Portfolio P&L Summary**

${rows.join("\n\n")}

─────────────────────────────
💵 **Total Cost Basis:** $${fmt(totalCost)}
💰 **Current Value:** $${fmt(totalValue)}
${arrow(pnl)} **Total P&L:** ${pnl >= 0 ? "+" : ""}$${fmt(pnl)} (${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%)

_CoinGecko + Yahoo Finance · ${now}_` }],
        };
      }

      case "get_top_movers": {
        const limit = (args?.limit as number) || 5;
        const data = await fetchJSON("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&price_change_percentage=24h");
        const sorted = [...data].sort((a: any, b: any) => b.price_change_percentage_24h - a.price_change_percentage_24h);
        const gainers = sorted.slice(0, limit);
        const losers = sorted.slice(-limit).reverse();
        const row = (c: any) => `  • **${c.symbol.toUpperCase()}** $${fmt(c.current_price)} | ${c.price_change_percentage_24h >= 0 ? "+" : ""}${c.price_change_percentage_24h?.toFixed(2)}% | MCap $${fmt(c.market_cap, 0)}`;
        return {
          content: [{ type: "text", text:
`🚀 **Top ${limit} Gainers (24h)**
${gainers.map(row).join("\n")}

💥 **Top ${limit} Losers (24h)**
${losers.map(row).join("\n")}

_Top 100 coins by MCap · CoinGecko · ${now}_` }],
        };
      }

      case "get_global_crypto_market": {
        const data = await fetchJSON("https://api.coingecko.com/api/v3/global");
        const d = data.data;
        const chg = d.market_cap_change_percentage_24h_usd;
        return {
          content: [{ type: "text", text:
`🌐 **Global Crypto Market**

${arrow(chg)} **Total Market Cap:** $${fmt(d.total_market_cap.usd, 0)}
📊 **24h Change:** ${chg >= 0 ? "+" : ""}${chg?.toFixed(2)}%
📦 **24h Volume:** $${fmt(d.total_volume.usd, 0)}
₿ **BTC Dominance:** ${d.market_cap_percentage.btc?.toFixed(1)}%
Ξ **ETH Dominance:** ${d.market_cap_percentage.eth?.toFixed(1)}%
🪙 **Active Coins:** ${d.active_cryptocurrencies.toLocaleString()}

_CoinGecko · ${now}_` }],
        };
      }

      default:
        return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (err: any) {
    return {
      content: [{ type: "text", text: `❌ Error in ${name}: ${err.message}\n\nThis may be an API rate limit. Wait a moment and retry.` }],
      isError: true,
    };
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("✅ FinanceOS MCP Server running");
