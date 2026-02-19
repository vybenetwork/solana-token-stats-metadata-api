import axios from 'axios';

const BASE = 'https://api.vybenetwork.xyz';
const TIMEOUT_MS = 60_000; // 60s for Vybe API requests
const MAX_403_RETRIES = 5;
const RETRY_DELAY_MS = 2000;

async function with403Retry(fn) {
  let lastErr;
  for (let attempt = 0; attempt <= MAX_403_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (err.response?.status === 403 && attempt < MAX_403_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export function createClient(apiKey) {
  const headers = {
    'X-API-KEY': apiKey,
    'Accept': 'application/json',
  };
  const config = { headers, timeout: TIMEOUT_MS };

  return {
    async getToken(mintAddress) {
      return with403Retry(async () => {
        const { data } = await axios.get(`${BASE}/v4/tokens/${mintAddress}`, config);
        return data;
      });
    },

    /**
     * Top holders for a token (top 100; updated every 3 hours).
     * @see https://docs.vybenetwork.com/reference/get_top_holders_v4
     */
    async getTopHolders(mintAddress, options = {}) {
      const { limit = 100, page = 0, sortByAsc, sortByDesc } = options;
      const params = { limit, page };
      if (sortByAsc) params.sortByAsc = sortByAsc;
      if (sortByDesc) params.sortByDesc = sortByDesc;
      return with403Retry(async () => {
        const { data } = await axios.get(`${BASE}/v4/tokens/${mintAddress}/top-holders`, {
          ...config,
          params,
        });
        return data;
      });
    },

    /**
     * Last N trades for a base token.
     * @see https://docs.vybenetwork.com/reference (trades v4)
     */
    async getTrades(baseMintAddress, options = {}) {
      const { limit = 100, sortByDesc = 'blockTime' } = options;
      return with403Retry(async () => {
        const { data } = await axios.get(`${BASE}/v4/trades`, {
          ...config,
          params: { baseMintAddress, limit, sortByDesc },
        });
        return data;
      });
    },

    /**
     * DEX / program list for labeling program addresses in trades.
     */
    async getPrograms() {
      try {
        return await with403Retry(async () => {
          const { data } = await axios.get(`${BASE}/v4/programs`, config);
          return data;
        });
      } catch {
        return { data: [] };
      }
    },
  };
}
