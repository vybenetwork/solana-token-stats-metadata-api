# Solana Token Stats & Metadata API

**By Eoin Brady** · 2 min read

This repository demonstrates how to use the Vybe Solana Token API to fetch token stats and metadata for any SPL token.

**Retrieve:**

- Token price
- Market cap
- 24h volume
- Holder count
- Symbol, name, decimals
- Top holders (top 100; updated every 3 hours)

Data is sourced from Pump.fun, Raydium, Orca, and 30+ other Solana DEX programs using vetted market data. When metadata is available from both Pump.fun and PumpSwap, PumpSwap is preferred.

This repo includes:

- Token details (stats and metadata) endpoint
- Top holders endpoint
- A browser-based web app (GUI) to browse token stats, last 100 trades summary, and top holders in one view

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

### Top Holders

The app requests data in sequence to space out API calls: (1) **top holders** via `GET /v4/tokens/{mintAddress}/top-holders` (with `page=0`, `limit=100`, `sortByDesc=percentageOfSupplyHeld`), (2) 2s delay, (3) **token details** via `GET /v4/tokens/{mintAddress}`, (4) 2s delay, (5) **last 100 trades** via `GET /v4/trades?baseMintAddress=…&limit=100&sortByDesc=blockTime`, (6) **programs list** (for DEX labels) and token details for each unique quote mint (to show symbols). A **Last 100 trades summary** section (before the top holders table) shows counts of unique program addresses (labeled from the programs API and well-known DEX names) and unique quote tokens (with symbol from token details). The top holders table shows rank, owner, balance, value USD, and % of supply (top 100 by highest % of supply; updated every 3 hours).

### Single REST API

Use one Solana token API to retrieve:

- Token price
- Metadata
- Top holders

### Web App (GUI)

The included web app allows you to:

- Enter a token mint
- Click **Load Token Metadata & Top Holders** to load data: the app fetches top holders, then token stats and metadata, then last 100 trades and builds a trades summary (unique programs and quote tokens with symbols)
- View token stats (price, market cap, volume 24h, holders) and metadata (symbol, name, decimals)
- View **Last 100 trades summary**: unique program addresses (with DEX labels) and unique quote mints (with symbols)
- View top holders when the API returns data (e.g. for tokens on Pump.fun / PumpSwap)

When metadata is available from both Pump.fun and PumpSwap, PumpSwap’s result is preferred. All data is fetched from the Vybe Solana Token API.

## Get a Free API Key

You’ll need a Vybe API key to run this demo.

- [Get your free Vybe API key](https://vybenetwork.com/pricing?utm_source=github&utm_medium=repo&utm_campaign=solana-token-stats-metadata-api)
- [View Vybe API documentation](https://docs.vybenetwork.com/docs/token-details-spl-token-2022?utm_source=github&utm_medium=repo&utm_campaign=solana-token-stats-metadata-api)

## How to Run

### 1. Clone the repository

```bash
git clone https://github.com/your-org/solana-token-stats-metadata-api.git
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

### 3️⃣ Last 100 Trades

**`GET /v4/trades`**

Returns the last 100 trades for a base token (e.g. the token mint). Used to build the **Last 100 trades summary** (unique program addresses and unique quote tokens with symbols).

| Parameter        | Required | Description |
|------------------|----------|-------------|
| baseMintAddress  | Yes      | Base token mint (query) |
| limit            | No       | Default 100, max 100 |
| sortByDesc       | No       | e.g. `blockTime` |

Proxy: **`GET /api/trades?baseMintAddress=…&limit=100&sortByDesc=blockTime`**

### 4️⃣ Programs (DEX list)

**`GET /api/programs`**

Returns the list of DEX programs used to label program addresses in the trades summary. The app merges this with well-known program IDs (Raydium, Orca, Pump.fun, Meteora, Phoenix, Jupiter, etc.) when the API does not return a label.

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
