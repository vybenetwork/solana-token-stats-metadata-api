# Solana Token Stats & Metadata API

A **Solana token API** demo for **token stats** and **metadata**: fetch token details, metrics, and **metadata** for any Solana token from **Pump.fun**, **Raydium**, Orca, and 30+ other DEXs using Vybe’s vetted market data. Use it as a **Solana token** data source for research, dashboards, or as a **token monitor** / **token tracker** backend. This repo includes a **web app (GUI)** to browse **token stats**, **metadata**, and markets in the browser.

## Why This Matters

**Token stats** and **metadata** are the foundation of token research, analytics, and trading tools. A **Solana token API** that aggregates from **Pump.fun**, **Raydium**, and other vetted markets gives you accurate price, volume, market cap, and holder data—without noise from junk pools. Vybe’s **token** details and **metadata** endpoints, combined with markets/pools, let you build a **token monitor** or **token tracker** that shows where each **token** trades (e.g. **Pump.fun**, **Raydium** CLMM). This demo uses two endpoints: **token** details/metrics (the core **token stats** and **metadata**) and markets/pools so you can list every market for a given DEX.

### What You Get

- **Token stats and metadata** — Price, market cap, 24h volume, holders, symbol, name, decimals for any SPL token.
- **Markets/pools by DEX** — See every **Raydium**, **Pump.fun**, Orca, or other DEX **market** where a token trades.
- **Single REST API** — One **Solana token API** for **token price**, **metadata**, and **liquidity** context.
- **Web app** — Browse **token** details and **markets** in the browser; use as a lightweight **token monitor** or **token tracker**.

### How This Helps

Use this demo for **token research**, **token analytics**, dashboards, or as the backend for a **token monitor** / **token tracker**. **Token stats** and **metadata** from vetted **DEX** and **AMM** sources avoid junk pools. Get your API key and clone to build on top of the same **REST API**.

---

**Get a free Vybe API key** (required to run this demo):

**[Get your free Vybe API key →](https://vybenetwork.com/pricing?utm_source=github&utm_medium=repo&utm_campaign=solana-token-stats-metadata-api)**  
**[Vybe API documentation →](https://docs.vybenetwork.com/docs/token-details-spl-token-2022?utm_source=github&utm_medium=repo&utm_campaign=solana-token-stats-metadata-api)**

---

## How to Run

1. Clone this repository:
```bash
git clone https://github.com/your-org/solana-token-stats-metadata-api.git
cd solana-token-stats-metadata-api
```

2. Install dependencies:
```bash
npm install
```

3. Set your API key:
```bash
cp .env.example .env
# Edit .env and add your VYBE_API_KEY
```

4. Run the demo (CLI):
```bash
npm start
```

5. Run the web app (GUI):
```bash
npm run dev
```
Then open **http://localhost:3000**. The UI shows **token stats** (price, market cap, volume), **metadata**, and a list of markets where the **token** trades on **Pump.fun**, **Raydium**, and other DEXs.

## Web App / GUI

The included web app is a **Solana token** viewer and lightweight **token monitor** / **token tracker**: enter a token mint to view **token stats** (price, market cap, volume 24h, holders) and **metadata**; select a DEX program (e.g. **Raydium** CLMM, **Pump.fun**) to see markets/pools that include that **token**; and switch between token view and markets table. All **token stats** and **metadata** are fetched from the Vybe **Solana token API** and displayed in the browser.

## Solana Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `GET /v4/tokens/{mintAddress}` | Token stats, metadata, price, market cap, volume |
| `GET /v4/markets` | List markets/pools by DEX program (Raydium, Orca, Pump.fun, etc.) |

- [Token Details & Metrics](https://docs.vybenetwork.com/docs/token-details-spl-token-2022)
- [Fetch Markets / Pools](https://docs.vybenetwork.com/docs/fetch-markets-pools)

## Code Example

```javascript
const axios = require('axios');

const API = 'https://api.vybenetwork.com';
const headers = { 'X-API-Key': process.env.VYBE_API_KEY };

// 1) Token stats & metadata (price, volume, market cap, etc.)
async function getTokenDetails(mintAddress) {
  const { data } = await axios.get(`${API}/v4/tokens/${mintAddress}`, { headers });
  return data;
}

// 2) Markets/pools for a DEX – see where this token is traded (Raydium, Pump.fun, etc.)
async function getMarketsForProgram(programAddress, limit = 20) {
  const { data } = await axios.get(
    `${API}/v4/markets`,
    { params: { programAddress, limit }, headers }
  );
  return data;
}

const tokenMint = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'; // BONK
const raydiumClmm = 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK';

Promise.all([
  getTokenDetails(tokenMint),
  getMarketsForProgram(raydiumClmm, 10)
]).then(([token, markets]) => {
  console.log('Token stats:', token.symbol, token.priceUsd, token.volume24hUsd);
  const tokenMarkets = markets.data?.filter(m =>
    m.baseTokenMint === tokenMint || m.quoteTokenMint === tokenMint
  );
  console.log('Markets for token (Raydium):', tokenMarkets?.length);
});
```

## Example Output

```json
{
  "mintAddress": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  "symbol": "BONK",
  "name": "Bonk",
  "decimals": 5,
  "priceUsd": "0.00001234",
  "marketCapUsd": "1234567890",
  "volume24hUsd": "12345678",
  "holders": 123456
}
```

## Need Help?

Reach out to Vybe support:
- **Telegram**: [Vybe Telegram community](https://t.me/vybenetwork)
- **Support ticket**: [Submit a ticket on the Vybe website](https://vybenetwork.com)
