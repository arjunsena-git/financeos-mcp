# FinanceOS MCP 💰

> Real-time finance & crypto superpowers for Claude. Built for investors, by an investor.

Give Claude live access to crypto prices, stock quotes, portfolio P&L, risk analysis, Bittensor stats, and market sentiment — all in natural language.

---

## 🛠️ Tools Included

| Tool | What it does |
|---|---|
| `get_crypto_price` | Live price, 24h/7d change, market cap for any crypto |
| `get_portfolio_summary` | Real-time P&L across your crypto holdings |
| `get_stock_quote` | NSE, BSE & global stock prices (Yahoo Finance) |
| `get_fear_greed_index` | Crypto market sentiment (0–100 scale) |
| `get_bittensor_stats` | TAO price, network data, staking APY overview |
| `get_top_movers` | Top gainers & losers in the last 24h |
| `analyze_portfolio_risk` | Diversification score, concentration risk, suggestions |

---

## ⚡ Quick Setup (5 minutes)

### Step 1 — Install

```bash
git clone https://github.com/YOUR_USERNAME/financeos-mcp
cd financeos-mcp
npm install
npm run build
```

### Step 2 — Add to Claude Desktop

Open your Claude Desktop config file:

- **Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Add this (replace the path with your actual path):

```json
{
  "mcpServers": {
    "financeos": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/financeos-mcp/build/index.js"]
    }
  }
}
```

### Step 3 — Restart Claude Desktop

Quit and reopen Claude Desktop. You should see a 🔨 hammer icon in the chat box. Click it — you'll see all 7 FinanceOS tools listed.

### Step 4 — Try it out

Ask Claude any of these:
- *"What's the current Bitcoin price and sentiment?"*
- *"Analyse my portfolio: bitcoin:0.5, ethereum:2, solana:10"*
- *"How is RELIANCE.NS doing today?"*
- *"Show me top 5 crypto gainers right now"*
- *"Give me a full Bittensor overview"*

---

## 💬 Example Prompts

```
"How is my portfolio doing? I hold 0.5 BTC, 2 ETH, and 15 SOL.
 I bought BTC at $45000, ETH at $2000, SOL at $120."

"What's the market sentiment today? Should I be buying or waiting?"

"Analyse the risk of this portfolio: 
 bitcoin:20000, ethereum:8000, INFY.NS:5000, gold:3000, reliance:4000"

"Give me a complete Bittensor briefing — price, network, staking."
```

---

## 🔧 Test Without Claude

Use the MCP Inspector to test all tools in a browser UI:

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

Open the URL shown → Connect → click any tool → Run.

---

## 💰 Pricing (Pro Version)

| Plan | Price | Features |
|---|---|---|
| Free | $0 | 3 tools, 50 calls/day |
| Pro | $19/mo | All 7 tools, unlimited calls |
| Team | $49/mo | Multi-user, webhooks, priority support |

**Get Pro:** [your-gumroad-link-here]

---

## 🗺️ Roadmap

- [ ] Dividend calendar for stocks
- [ ] DeFi yield tracker (Aave, Compound)
- [ ] Indian mutual fund NAV lookup
- [ ] REIT yield comparator
- [ ] P2P lending portfolio tracker
- [ ] Bittensor subnet miner rankings

---

## 📋 Data Sources

All free, no API keys required:
- [CoinGecko](https://coingecko.com) — crypto prices
- [Yahoo Finance](https://finance.yahoo.com) — stock quotes
- [Alternative.me](https://alternative.me/crypto/fear-and-greed-index/) — fear & greed index

---

## 📄 License

MIT — free to use, modify, and sell integrations.

---

*Built with ❤️ using the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk)*
