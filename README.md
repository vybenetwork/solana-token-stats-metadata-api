# Solana Token Stats & Metadata API

This repository demonstrates how to use the Vybe Solana Token API to fetch token stats and metadata for any SPL token.

**Retrieve:**

- Token price
- Market cap
- 24h volume
- Holder count
- Symbol, name, decimals
- Top holders (top 100; updated every 3 hours)
- Last 1000 trades summary (top 10 programs, top 10 quote tokens with symbols)

Data is sourced from Pump.fun, Raydium, Orca, and 30+ other Solana DEX programs using vetted market data. When metadata is available from both Pump.fun and PumpSwap, PumpSwap is preferred.

This repo includes:

- Token details (stats and metadata) endpoint
- Top holders endpoint
- A browser-based web app (GUI) to browse token stats, last 1000 trades summary, and top holders in one view (quote mint and owner addresses link to Solscan in a new tab)

## Why This Matters

Token stats and metadata are foundational for:

- Token research
- Analytics dashboards
- Trading tools
- Token monitors / token trackers

A Solana token API that aggregates data from Pump.fun, Raydium, and other vetted markets provides consistent token price, volume, and market cap data.

Vybe’s `/v4/tokens/{mintAddress}` endpoint returns token details and metrics; `/v4/tokens/{mintAddress}/top-holders` returns the top 100 holders sorted by highest percentage of supply (updated every 3 hours). When both Pump.fun and PumpSwap return results for metadata, use PumpSwap’s.

This demo uses:

- **Token details / metrics endpoint** — price, market cap, volume, metadata
- **Top holders endpoint** — top token holders (rank, balance, value USD, % supply)
- **Trades endpoint** — last 1000 trades to build programs + quote-token summary
- **Programs endpoint** — DEX labels for program addresses in the trades summary

## What You Get

### Token Stats & Metadata

Retrieve:

- Price
- Market cap
- 24h volume
- Holder count
- Symbol
- Name
- Decimals
- Current supply
- Price change metrics (e.g. 1d, 7d where available)

For any SPL token mint.

### Fetch sequence (web app)

The app requests data in this order, with 2s delays between stages:

1. **Token details** — `GET /v4/tokens/{mintAddress}`
2. **Last 1000 trades** — `GET /v4/trades?baseMintAddress=…&limit=1000&sortByDesc=blockTime`
3. **Trades summary** — from the trades array: count by `programAddress` and by `quoteMintAddress`; sort by count descending; take top 10 programs and top 10 quote mints (see below)
4. **Programs list** — `GET /api/programs` (DEX labels); merge with well-known program IDs (Raydium, Orca, Pump.fun, etc.)
5. **Quote symbols** — for the top 10 quote mints only: use hardcoded WSOL/USDC or `GET /api/token-symbol/:mint`; if fewer than 10 have a symbol, fetch the next batch of mints until 10 displayable or none left
6. **Top holders** — `GET /v4/tokens/{mintAddress}/top-holders?page=0&limit=100&sortByDesc=percentageOfSupplyHeld`

### Last 1000 trades: fetch and top 10 extraction

- **Fetch:** `GET /v4/trades` with `baseMintAddress`, `limit=1000`, `sortByDesc=blockTime` (server proxy: `GET /api/trades?…`).
- **Top 10 programs:** From the trades array, count trades per `programAddress`; sort by count descending; take the first 10. Labels come from `GET /api/programs` and a well-known DEX map (Raydium, Orca, Pump.fun, Meteora, Phoenix, Jupiter, etc.). Program addresses in the UI link to Solscan in a new tab.
- **Top 10 quote tokens:** From the trades array, count trades per `quoteMintAddress`; sort by count descending. For display we need a symbol: WSOL and USDC are hardcoded; for the rest we call `GET /api/token-symbol/:mint` only for mints that can appear in the top 10 (first 10 by count, then next batch if some fail or have no symbol). Mint addresses in the UI link to Solscan in a new tab.

### Top Holders

After the trades summary, the app fetches **top holders** via `GET /v4/tokens/{mintAddress}/top-holders` (`page=0`, `limit=100`, `sortByDesc=percentageOfSupplyHeld`). The table shows rank, owner, balance, value (USD), and % of supply (top 100 by highest %; updated every 3 hours). Owner addresses link to Solscan in a new tab.

### Single REST API

Use one Solana token API to retrieve:

- Token price
- Metadata
- Top holders

### Web App (GUI)

The included web app allows you to:

- Enter a token mint
- Click **Load Token Metadata & Top Holders** to load data: the app fetches token details, then last 1000 trades (and builds the programs + quote-token summary), then top holders (with 2s delays between)
- View token stats (price, market cap, volume 24h, holders) and metadata (symbol, name, decimals)
- View **Last 1000 trades summary**: top 10 programs and top 10 quote tokens (mint and program addresses open Solscan in a new tab)
- View top 100 holders (owner addresses open Solscan in a new tab)

When metadata is available from both Pump.fun and PumpSwap, PumpSwap’s result is preferred. All data is fetched from the Vybe Solana Token API.

## Get a Free API Key

You’ll need a Vybe API key to run this demo.

- [Get your free Vybe API key](https://vybenetwork.com/pricing?utm_source=github&utm_medium=repo&utm_campaign=solana-token-stats-metadata-api)
- [View Vybe API documentation](https://docs.vybenetwork.com/docs/token-details-spl-token-2022?utm_source=github&utm_medium=repo&utm_campaign=solana-token-stats-metadata-api)

## How to Run

### 1. Clone the repository

```bash
git clone https://github.com/vybenetwork/solana-token-stats-metadata-api.git
cd solana-token-stats-metadata-api
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set your API key

```bash
cp .env.example .env
# Add your VYBE_API_KEY to .env
```

### 4. Run the CLI demo

```bash
npm start
```

### 5. Run the Web App (GUI)

From the project directory:

```bash
npm run dev
```

If you haven’t set `VYBE_API_KEY` in `.env`, you can pass it inline:

```bash
VYBE_API_KEY="your-api-key" npm run dev
```

Open:

**http://localhost:3000**

Enter a token mint and click **Load Token Metadata & Top Holders** to see token stats, metadata, and top holders (when the API returns data, e.g. for Pump.fun / PumpSwap tokens).

### 6. (Optional) Run with Cloudflare Tunnel

To expose the app on a public URL (e.g. for sharing or testing from another device), use the tunnel option. Requires [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/) installed.

From the project directory:

```bash
npm run dev:tunnel
```

(Uses `VYBE_API_KEY` from `.env`. To pass the key inline: `VYBE_API_KEY="your-api-key" npm run dev:tunnel`.)

Other ways to enable the tunnel:

```bash
node server.js --tunnel
# or
TUNNEL=1 node server.js
```

The console will print a **Cloudflare Tunnel URL** (e.g. `https://xxx.trycloudflare.com`). Open that URL in a browser to access the app from the internet.

## API Configuration

**Base URL**

```
https://api.vybenetwork.xyz
```

**Required Headers**

```
X-API-KEY: <your-api-key>
Accept: application/json
```

The app uses a **60-second timeout** for Vybe requests. If the Vybe API is slow, the request will fail with a timeout error instead of hanging.

## Solana API Endpoints Used

### 1️⃣ Token Details (Stats & Metadata)

**`GET /v4/tokens/{mintAddress}`**

Retrieve token stats, metadata, and metrics.

| Parameter    | Required | Description           |
|-------------|----------|-----------------------|
| mintAddress | Yes      | Token mint (SPL, base58) |

No query parameters.

Response fields include:

- symbol
- name
- mintAddress
- priceUsd
- marketCapUsd
- decimals
- logoUrl
- category
- currentSupply
- price1d
- price7d
- volume24hUsd
- holders

### 2️⃣ Top Holders

**`GET /v4/tokens/{mintAddress}/top-holders`**

Returns the top 100 token holders sorted by highest percentage of supply (updated every 3 hours). Request uses `page=0`, `limit=100`, `sortByDesc=percentageOfSupplyHeld`. Fetched when loading a token; if the response is positive (e.g. token on Pump.fun or PumpSwap), the table is shown.

| Parameter     | Required | Description |
|---------------|----------|-------------|
| mintAddress   | Yes      | Token mint (path) |
| limit         | No       | Per page (default/max 100) |
| page          | No       | 0-indexed |
| sortByAsc     | No       | e.g. `rank`, `valueUsd`, `balance`, `percentageOfSupplyHeld` |
| sortByDesc    | No       | Same options |

- [Top Holders (API reference)](https://docs.vybenetwork.com/reference/get_top_holders_v4)

### 3️⃣ Last 1000 Trades

**`GET /v4/trades`**

Returns the last 1000 trades for a base token. Used to build the **Last 1000 trades summary** (top 10 programs and top 10 quote tokens with symbols). The server proxies this as **`GET /api/trades?baseMintAddress=…&limit=1000&sortByDesc=blockTime`**.

| Parameter        | Required | Description |
|------------------|----------|-------------|
| baseMintAddress  | Yes      | Base token mint (query) |
| limit            | No       | Default/max 1000 |
| sortByDesc       | No       | e.g. `blockTime` |

### 4️⃣ Programs (DEX list)

**`GET /api/programs`**

Returns the list of DEX programs used to label program addresses in the trades summary. The app merges this with well-known program IDs (Raydium, Orca, Pump.fun, Meteora, Phoenix, Jupiter, etc.) when the API does not return a label.

### 5️⃣ Token symbol (server)

**`GET /api/token-symbol/:mint`**

Returns the symbol for a mint (Vybe token API + Metaplex metadata fallback). Used to show quote token symbols in the trades summary. Optional env: `SOLANA_RPC_URL` for Metaplex RPC (default: public mainnet).

## Code Example

```javascript
const axios = require('axios');
const API = 'https://api.vybenetwork.xyz';
const headers = {
  'X-API-KEY': process.env.VYBE_API_KEY,
  'Accept': 'application/json'
};
// Token stats & metadata
async function getTokenDetails(mintAddress) {
  const { data } = await axios.get(`${API}/v4/tokens/${mintAddress}`, { headers });
  return data;
}
// Top holders (updated every 3 hours)
async function getTopHolders(mintAddress, limit = 100) {
  const { data } = await axios.get(
    `${API}/v4/tokens/${mintAddress}/top-holders`,
    { params: { limit }, headers }
  );
  return data;
}
const tokenMint = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
Promise.all([
  getTokenDetails(tokenMint),
  getTopHolders(tokenMint, 10)
]).then(([token, holders]) => {
  console.log('Token stats:', token.symbol, token.price, token.marketCap);
  console.log('Top holders:', holders.data?.length);
});
```

## Example Response

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

## Support

- **Telegram:** [Vybe community](https://t.me/vybenetwork)
- **Support ticket:** [Submit a ticket via vybenetwork.xyz](https://vybenetwork.com)
