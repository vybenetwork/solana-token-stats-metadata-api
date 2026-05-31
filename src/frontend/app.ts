/**
 * Token stats UI — built from TypeScript; compiles to public/app.js.
 * Types for API responses and DOM refs are inline to keep a single-file build.
 */

interface TokenData {
  symbol?: string;
  name?: string;
  mintAddress?: string;
  logoUrl?: string;
  decimal?: number;
  decimals?: number;
  category?: string;
  subcategory?: string;
  verified?: boolean;
  price?: number;
  marketCap?: number;
  price1d?: number;
  price7d?: number;
  currentSupply?: number;
  tokenAmountVolume24h?: number;
  usdValueVolume24h?: number;
  updateTime?: number;
}

interface HolderRow {
  rank?: number;
  ownerAddress?: string;
  ownerName?: string;
  balance?: number | string;
  valueUsd?: number;
  percentageOfSupplyHeld?: number;
}

interface TopTraderRow {
  accountAddress?: string;
  accountName?: string;
  metrics?: {
    realizedPnlUsd?: number;
    tradesCount?: number;
    tradesVolumeUsd?: number;
    winRate?: number;
  };
}

interface ProgramItem {
  id?: string;
  address?: string;
  programAddress?: string;
  name?: string;
  label?: string;
  labels?: string[];
  symbol?: string;
}

const mintInput = document.getElementById('mint') as HTMLInputElement;
const fetchAllBtn = document.getElementById('fetchAll') as HTMLButtonElement;
const tokenSection = document.getElementById('tokenSection');
const tokenSectionLoading = document.getElementById('tokenSectionLoading') as HTMLElement;
const tokenSectionError = document.getElementById('tokenSectionError') as HTMLElement;
const tokenLogo = document.getElementById('tokenLogo') as HTMLImageElement;
const tokenSymbol = document.getElementById('tokenSymbol') as HTMLElement;
const tokenName = document.getElementById('tokenName') as HTMLElement;
function setTokenLastUpdated(text: string): void {
  const el = document.getElementById('tokenLastUpdatedValue');
  if (el) el.textContent = text;
}

const TOKEN_LAST_UPDATED_ICON =
  '<svg class="token-stat-row-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';

function tokenLastUpdatedRowHtml(): string {
  return `<div class="token-stat-row token-stat-row--lastUpdated" role="group" aria-label="Last updated">
    <div class="token-stat-row-icon" aria-hidden="true">${TOKEN_LAST_UPDATED_ICON}</div>
    <div class="token-stat-row-body">
      <span class="token-stat-row-label">Last updated</span>
      <span class="token-stat-row-value" id="tokenLastUpdatedValue">—</span>
    </div>
  </div>`;
}
const tokenStats = document.getElementById('tokenStats') as HTMLElement;
const tradesSummarySection = document.getElementById('tradesSummarySection');
const tradesSummaryLoading = document.getElementById('tradesSummaryLoading') as HTMLElement;
const tradesSummaryLoadingText = document.getElementById('tradesSummaryLoadingText') as HTMLElement;
const tradesFetchModePaged = document.getElementById('tradesFetchModePaged') as HTMLInputElement;
const tradesFetchLock = document.getElementById('tradesFetchLock') as HTMLButtonElement;
const tradesFetchSwitchLabel = document.getElementById('tradesFetchSwitchLabel') as HTMLLabelElement;
const tradesSummaryError = document.getElementById('tradesSummaryError') as HTMLElement;

const TRADES_FETCH_STORAGE_KEY = 'tradesFetchMode';
const TRADES_FETCH_LOCKED_STORAGE_KEY = 'tradesFetchLocked';

function getTradesFetchMode(): 'paged' | 'single' {
  const v = localStorage.getItem(TRADES_FETCH_STORAGE_KEY);
  return v === 'paged' || v === 'single' ? v : 'single';
}

function setTradesFetchMode(mode: 'paged' | 'single'): void {
  localStorage.setItem(TRADES_FETCH_STORAGE_KEY, mode);
}

function isTradesFetchLocked(): boolean {
  return localStorage.getItem(TRADES_FETCH_LOCKED_STORAGE_KEY) !== 'false';
}

function setTradesFetchLocked(locked: boolean): void {
  localStorage.setItem(TRADES_FETCH_LOCKED_STORAGE_KEY, locked ? 'true' : 'false');
}

function applyTradesFetchUI(): void {
  const locked = isTradesFetchLocked();
  const mode = getTradesFetchMode();
  if (tradesFetchLock) {
    tradesFetchLock.setAttribute('aria-pressed', String(locked));
  }
  if (tradesFetchModePaged) {
    tradesFetchModePaged.checked = mode === 'paged';
  }
  if (tradesFetchSwitchLabel) {
    tradesFetchSwitchLabel.classList.toggle('trades-fetch-switch--locked', locked);
    tradesFetchSwitchLabel.title = locked
      ? 'Locked: mode follows volume (≥500k = Paged). Unlock to use your preference.'
      : 'Paged: 10×100. Single: 1×1000.';
  }
}
const tradesSummaryMeta = document.getElementById('tradesSummaryMeta') as HTMLElement;
const tradesSummaryContent = document.getElementById('tradesSummaryContent') as HTMLElement;
const topTradersLoading = document.getElementById('topTradersLoading') as HTMLElement;
const topTradersError = document.getElementById('topTradersError') as HTMLElement;
const topTradersMeta = document.getElementById('topTradersMeta') as HTMLElement;
const topTradersBody = document.getElementById('topTradersBody') as HTMLElement;
const holdersSection = document.getElementById('holdersSection');
const holdersLoading = document.getElementById('holdersLoading') as HTMLElement;
const holdersError = document.getElementById('holdersError') as HTMLElement;
const holdersMeta = document.getElementById('holdersMeta') as HTMLElement;
const holdersBody = document.getElementById('holdersBody') as HTMLElement;
const errorSection = document.getElementById('errorSection') as HTMLElement;
const errorText = document.getElementById('errorText') as HTMLElement;

/** Well-known DEX program IDs → label (used when labeled-program-account has no match). */
const WELL_KNOWN_PROGRAMS: Record<string, string> = {
  '675kPX9MHTjS2zt1qwr1sgbV5tjF6n5paF8GcaxHfL8r': 'Raydium',
  '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP': 'Orca',
  '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P': 'Pump.fun',
  'EewxydAPCCVuNEyrVN68PuSYdQ7wKn27V9Gje1wcB3NH': 'Orca (Whirlpool)',
  'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK': 'Raydium CLMM',
  'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C': 'Raydium CPMM',
  'Gswppe6ERWKpUTXvRPfXdzHhiCyJvLadVvXGfdpBqcE1': 'Guac Swap',
  'PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY': 'Phoenix',
  'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo': 'Meteora',
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4': 'Jupiter',
};

/** Hardcoded quote symbols: no fetch for these mints. */
const HARDCODED_QUOTE_SYMBOLS: Record<string, string> = {
  So11111111111111111111111111111111111111112: 'WSOL',
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 'USDC',
};

function truncateAddress(addr: string | undefined): string {
  if (!addr || addr.length <= 12) return addr ?? '';
  return addr.slice(0, 4) + '....' + addr.slice(-4);
}

function truncateProgramAddress(addr: string | undefined): string {
  if (!addr || addr.length <= 14) return addr ?? '';
  return addr.slice(0, 5) + '....' + addr.slice(-6);
}

function truncateSymbolDisplay(sym: string): string {
  if (!sym) return sym;
  const s = sym.toUpperCase();
  return s.length > 5 ? s.slice(0, 5) : s;
}

function hasRealLabel(programLabels: Record<string, string>, addr: string): boolean {
  const label = programLabels[addr];
  return !!(label && label !== addr);
}

function hasQuoteSymbol(mint: string, quoteSymbols: Record<string, string>): boolean {
  const s = HARDCODED_QUOTE_SYMBOLS[mint] || quoteSymbols[mint];
  return !!(s && s !== mint && s.length < 25);
}

function quoteDisplay(mint: string, quoteSymbols: Record<string, string>): string {
  const s = HARDCODED_QUOTE_SYMBOLS[mint] || quoteSymbols[mint];
  if (s && s !== mint && s.length < 25) return s;
  return truncateAddress(mint);
}

function showError(msg: string | unknown): void {
  errorText.textContent = typeof msg === 'object' ? JSON.stringify(msg, null, 2) : String(msg);
  errorSection.hidden = false;
}

function clearError(): void {
  errorSection.hidden = true;
}

function showSectionError(
  el: HTMLElement | null,
  res: Response | null,
  data: { code?: number } | null
): void {
  if (!el) return;
  el.textContent =
    data?.code != null ? `Failed (code ${data.code})` : res?.status ? `Failed (${res.status})` : 'Failed';
  el.hidden = false;
  el.removeAttribute('aria-hidden');
}

function hideSectionError(el: HTMLElement | null): void {
  if (!el) return;
  el.textContent = '';
  el.hidden = true;
  el.setAttribute('aria-hidden', 'true');
}

function formatNum(n: number | string | null | undefined): string {
  if (n == null) return '—';
  if (typeof n === 'number') {
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
    return n.toFixed(4);
  }
  return String(n);
}

/** Integer formatting for counts and whole-number values (no decimals). */
function formatInt(n: number | null | undefined): string {
  if (n == null) return '—';
  const num = Number(n);
  if (Number.isNaN(num)) return '—';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return Math.round(num).toLocaleString();
}

/** Full USD amount: $X,XXX USD or $X.XX USD when value < 10; no decimals unless |value| < 10, max 2 decimals. */
function formatUsdFull(n: number | null | undefined): string {
  if (n == null) return '—';
  const num = Number(n);
  if (Number.isNaN(num)) return '—';
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  if (abs < 10) {
    const s = num.toFixed(2);
    return `$${s} USD`;
  }
  const rounded = Math.round(num);
  return `$${sign}${Math.abs(rounded).toLocaleString()} USD`;
}

/** Price formatting: no trailing zeros. >=1 → 2 decimals (424.00→424, 424.50→424.50); 0.0099 < x < 1 → 4 decimals; ≤0.0099 → up to 12 decimals. */
function formatPrice(n: number | null | undefined): string {
  if (n == null) return '—';
  const num = Number(n);
  if (Number.isNaN(num)) return '—';
  const trim = (s: string) => s.replace(/\.?0+$/, '') || '0';
  if (num >= 1) {
    const s = num.toFixed(2);
    return s.endsWith('.00') ? s.replace(/\.00$/, '') : s;
  }
  if (num > 0.0099) return trim(num.toFixed(4));
  return trim(num.toFixed(12));
}

/** Balance with symbol: no trailing zeros; >=10 no decimals; 1–10 max 2 decimals; <1 max 4 decimals; B/M shortened; commas. */
function formatBalance(n: number | string | null | undefined, symbol: string): string {
  if (n == null || n === '') return '—';
  const num = Number(n);
  if (Number.isNaN(num)) return '—';
  const sym = symbol && String(symbol).trim() ? ` ${String(symbol).trim()}` : '';
  const trim = (s: string) => s.replace(/\.?0+$/, '') || '0';
  if (num >= 1e9) {
    const b = num / 1e9;
    const str = b >= 10 ? Math.round(b).toLocaleString() : trim(b.toFixed(2));
    return str + 'B' + sym;
  }
  if (num >= 1e6) {
    const m = num / 1e6;
    const str = m >= 10 ? Math.round(m).toLocaleString() : trim(m.toFixed(2));
    return str + 'M' + sym;
  }
  if (num >= 10) {
    return Math.round(num).toLocaleString() + sym;
  }
  if (num >= 1) {
    return trim(num.toFixed(2)) + sym;
  }
  if (num > 0) {
    return trim(num.toFixed(4)) + sym;
  }
  return num === 0 ? '0' + sym : '—';
}

const loadingIndicator = document.getElementById('loadingIndicator') as HTMLElement;
const DEMO_MINT = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
const DEMO_SNAPSHOT_URL = '/bonk-snapshot.json';

const MAX_FETCH_RETRIES = 5;
const FETCH_RETRY_DELAY_MS = 2000;

async function fetchWithRetry(url: string, options: RequestInit = {}): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_FETCH_RETRIES; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 502 || res.status === 503 || res.status === 504) {
        throw new Error(`HTTP ${res.status}`);
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_FETCH_RETRIES) {
        await new Promise((r) => setTimeout(r, FETCH_RETRY_DELAY_MS));
        continue;
      }
      throw lastErr;
    }
  }
  throw lastErr;
}

type TradeRow = {
  baseMintAddress?: string;
  quoteMintAddress?: string;
  programAddress?: string;
  marketAddress?: string;
  blockTime?: number;
};

/** Each row has baseMintAddress and quoteMintAddress. Use the one that isn't the mint being analysed. */
function otherMint(t: TradeRow, mintBeingAnalysed: string): string {
  const base = (t.baseMintAddress ?? '').trim();
  const quote = (t.quoteMintAddress ?? '').trim();
  return base === mintBeingAnalysed ? quote : base;
}

async function processTradesAndRender(
  trades: TradeRow[],
  mint: string,
  tokenData: TokenData | null,
  precomputed?: {
    programLabels?: Record<string, string>;
    quoteSymbols?: Record<string, string>;
  }
): Promise<void> {
  const quoteCountByMint: Record<string, number> = {};
  const programMarketCount: Record<string, Record<string, number>> = {};
  const programTradeCount: Record<string, number> = {};
  const marketCount: Record<string, number> = {};
  const marketQuoteCount: Record<string, Record<string, number>> = {};
  trades.forEach((t) => {
    const q = otherMint(t, mint).trim();
    const p = t.programAddress;
    const m = t.marketAddress;
    if (q && q !== mint) quoteCountByMint[q] = (quoteCountByMint[q] || 0) + 1;
    if (p) programTradeCount[p] = (programTradeCount[p] || 0) + 1;
    if (p && m) {
      if (!programMarketCount[p]) programMarketCount[p] = {};
      programMarketCount[p][m] = (programMarketCount[p][m] || 0) + 1;
    }
    if (m) {
      marketCount[m] = (marketCount[m] || 0) + 1;
      if (q && q !== mint) {
        if (!marketQuoteCount[m]) marketQuoteCount[m] = {};
        marketQuoteCount[m][q] = (marketQuoteCount[m][q] || 0) + 1;
      }
    }
  });
  const top10Markets = Object.entries(marketCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([addr, count]) => {
      const quoteCounts = marketQuoteCount[addr] || {};
      const bestQuoteMint =
        Object.entries(quoteCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      return { marketAddress: addr, count, bestQuoteMint };
    });
  const sortedByCount = Object.entries(quoteCountByMint).sort((a, b) => b[1] - a[1]);
  const uniquePrograms = [...new Set(trades.map((t) => t.programAddress).filter(Boolean))] as string[];
  const top10Programs = uniquePrograms
    .sort((a, b) => (programTradeCount[b] ?? 0) - (programTradeCount[a] ?? 0))
    .slice(0, 10);
  const programLabels: Record<string, string> = {};
  top10Programs.forEach((addr) => {
    programLabels[addr] = WELL_KNOWN_PROGRAMS[addr] || addr;
  });
  const quoteSymbols: Record<string, string> = { ...HARDCODED_QUOTE_SYMBOLS };
  if (precomputed?.programLabels || precomputed?.quoteSymbols) {
    if (precomputed.programLabels) Object.assign(programLabels, precomputed.programLabels);
    if (precomputed.quoteSymbols) Object.assign(quoteSymbols, precomputed.quoteSymbols);
  } else {
    const needSymbolMints = sortedByCount
      .slice(0, 20)
      .map(([mintAddr]) => mintAddr)
      .filter((mintAddr) => !HARDCODED_QUOTE_SYMBOLS[mintAddr]);
    const needLabel = top10Programs.filter((addr) => !WELL_KNOWN_PROGRAMS[addr]);
    const [labelsRes, symbolsRes] = await Promise.all([
      needLabel.length > 0
        ? fetchWithRetry('/api/programs/labeled-program-accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ programAddresses: needLabel }),
          })
        : Promise.resolve({ ok: true, json: async () => ({ labels: {} }) } as Response),
      needSymbolMints.length > 0
        ? fetchWithRetry('/api/token-symbols', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mints: needSymbolMints }),
          })
        : Promise.resolve({ ok: true, json: async () => ({ symbols: {} }) } as Response),
    ]);
    if (labelsRes.ok) {
      const body = (await labelsRes.json()) as { labels?: Record<string, string> };
      Object.assign(programLabels, body.labels || {});
    }
    if (symbolsRes.ok) {
      const body = (await symbolsRes.json()) as { symbols?: Record<string, string> };
      Object.assign(quoteSymbols, body.symbols || {});
    }
  }
  const displayList: { mint: string; count: number }[] = [];
  for (const [mintAddr, count] of sortedByCount) {
    if (hasQuoteSymbol(mintAddr, quoteSymbols)) {
      displayList.push({ mint: mintAddr, count });
      if (displayList.length >= 10) break;
    }
  }
  const programTopMarkets: Record<string, { marketAddress: string; bestQuoteMint: string | null }[]> = {};
  top10Programs.forEach((addr) => {
    const byMarket = programMarketCount[addr] || {};
    const sorted = Object.entries(byMarket).sort((a, b) => b[1] - a[1]);
    programTopMarkets[addr] = sorted.map(([marketAddress]) => {
      const quoteCounts = marketQuoteCount[marketAddress] || {};
      const bestQuoteMint =
        Object.entries(quoteCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      return { marketAddress, bestQuoteMint };
    });
  });
  const baseSymbol = ((tokenData?.symbol) ?? '').toUpperCase() || '—';
  const quoteList = displayList.slice(0, 10);
  const marketList = top10Markets.slice(0, 10);
  const quoteLen = quoteList.length;
  const marketLen = marketList.length;
  const rowCap =
    quoteLen < 10 || marketLen < 10 ? Math.min(quoteLen, marketLen) : 10;
  renderTradesSummary({
    tradesCount: trades.length,
    uniqueProgramCount: top10Programs.length,
    programLabels,
    uniquePrograms: top10Programs,
    programTradeCount,
    programTopMarkets,
    quoteSymbols,
    top10QuoteMints: quoteList.slice(0, rowCap),
    top10Markets: marketList.slice(0, rowCap),
    baseSymbol,
  });
}

const TRADES_PAGE_SIZE = 100;
const TRADES_TOTAL_PAGES = 10;
const TRADES_TOTAL = TRADES_PAGE_SIZE * TRADES_TOTAL_PAGES;

fetchAllBtn.addEventListener('click', async () => {
  const mint = mintInput.value.trim();
  if (!mint) return;
  clearError();
  renderEmptyState();
  fetchAllBtn.disabled = true;
  loadingIndicator.hidden = false;
  loadingIndicator.setAttribute('aria-hidden', 'false');
  tokenSectionLoading.hidden = false;
  tradesSummaryLoading.hidden = false;
  topTradersLoading.hidden = false;
  holdersLoading.hidden = false;

  let tokenData: TokenData | null = null;

  hideSectionError(tradesSummaryError);
  const tokenUrl = `/api/tokens/${encodeURIComponent(mint)}`;
  const topTradersUrl = `/api/wallets/top-traders?mintAddress=${encodeURIComponent(mint)}&resolution=30d&sortByDesc=realizedPnlUsd&limit=100`;
  const holdersUrl = `/api/tokens/${encodeURIComponent(mint)}/top-holders?page=0&limit=100&sortByDesc=percentageOfSupplyHeld`;

  const emptyTradesSummaryHtml = `
    <div class="trades-summary-grid">
      <div class="trades-summary-block trades-summary-quotes">
        <h3 class="trades-summary-subtitle">Quote tokens (top 10)</h3>
        <div class="table-wrap">
          <table class="trades-summary-table">
            <thead><tr><th>Symbol</th><th>Mint</th><th>Count</th></tr></thead>
            <tbody><tr><td>—</td><td>—</td><td>—</td></tbody>
          </table>
        </div>
      </div>
      <div class="trades-summary-block trades-summary-markets">
        <h3 class="trades-summary-subtitle">Top markets (top 10)</h3>
        <div class="table-wrap">
          <table class="trades-summary-table">
            <thead><tr><th>Market address</th><th>Pair</th><th>Count</th></tr></thead>
            <tbody><tr><td>—</td><td>—</td><td>—</td></tbody>
          </table>
        </div>
      </div>
      <div class="trades-summary-block trades-summary-programs trades-summary-programs-fullrow">
        <h3 class="trades-summary-subtitle">Programs (top 10)</h3>
        <div class="table-wrap">
          <table class="trades-summary-table">
            <colgroup><col class="col-label"><col class="col-address"><col class="col-top-market"><col class="col-count"></colgroup>
            <thead><tr><th>Label</th><th>Program address</th><th>Top Market</th><th>Count</th></tr></thead>
            <tbody><tr><td>—</td><td>—</td><td>—</td><td>—</td></tbody>
          </table>
        </div>
      </div>
    </div>`;

  const tokenPromise = fetchWithRetry(tokenUrl)
    .then(async (tokenRes) => {
      try {
        if (tokenRes.ok) {
          const data = (await tokenRes.json()) as TokenData;
          tokenData = data;
          renderToken(tokenData);
          hideSectionError(tokenSectionError);
        } else {
          const data = (await tokenRes.json().catch(() => ({}))) as TokenData;
          showSectionError(tokenSectionError, tokenRes, data as { code?: number });
          try {
            const symbolRes = await fetchWithRetry(`/api/token-symbol/${encodeURIComponent(mint)}`);
            const symbolData = symbolRes.ok ? ((await symbolRes.json()) as { symbol?: string }) : {};
            if (symbolData.symbol) {
              tokenData = { symbol: symbolData.symbol, mintAddress: mint };
              renderToken(tokenData);
            }
          } catch {
            /* keep section error visible */
          }
        }
      } catch {
        showSectionError(tokenSectionError, null, null);
      }
      tokenSectionLoading.hidden = true;
      tokenSectionLoading.setAttribute('aria-hidden', 'true');
    })
    .catch(() => {
      showSectionError(tokenSectionError, null, null);
      tokenSectionLoading.hidden = true;
      tokenSectionLoading.setAttribute('aria-hidden', 'true');
    });

  const topTradersPromise = fetchWithRetry(topTradersUrl)
    .then(async (topTradersRes) => {
      hideSectionError(topTradersError);
      if (!topTradersRes.ok) {
        const errData = (await topTradersRes.json?.().catch(() => ({}))) ?? {};
        showSectionError(topTradersError, topTradersRes, errData);
      }
      const topTradersData = topTradersRes.ok
        ? (await topTradersRes.json().catch(() => ({ data: [] }))) as { data?: TopTraderRow[] }
        : { data: [] };
      if (topTradersRes.ok && topTradersData.data?.length) {
        renderTopTraders(topTradersData);
        hideSectionError(topTradersError);
      } else {
        topTradersMeta.textContent = '—';
        topTradersBody.innerHTML = '<tr><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>';
      }
      topTradersLoading.hidden = true;
      topTradersLoading.setAttribute('aria-hidden', 'true');
    })
    .catch(() => {
      topTradersLoading.hidden = true;
      topTradersLoading.setAttribute('aria-hidden', 'true');
    });

  const holdersPromise = (async () => {
    try {
      // Ensure the token details (and symbol) have been loaded before we
      // render holders so the balance column can show the correct symbol.
      await tokenPromise;

      const holdersRes = await fetchWithRetry(holdersUrl);
      hideSectionError(holdersError);
      if (!holdersRes.ok) {
        const errData = (await holdersRes.json?.().catch(() => ({}))) ?? {};
        showSectionError(holdersError, holdersRes, errData);
      }
      const holdersData = holdersRes.ok
        ? ((await holdersRes.json().catch(() => ({ data: [] }))) as { data?: HolderRow[] })
        : { data: [] };
      if (holdersRes.ok && holdersData.data?.length) {
        renderHolders(holdersData);
        hideSectionError(holdersError);
      } else {
        holdersMeta.textContent = '—';
        holdersBody.innerHTML =
          '<tr><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>';
      }
    } catch {
      // ignore; section error/loader handled below
    } finally {
      holdersLoading.hidden = true;
      holdersLoading.setAttribute('aria-hidden', 'true');
    }
  })();

  await tokenPromise;

  const tradesSummaryHeading = tradesSummarySection?.querySelector('.section-header h2');
  const usdVolume24h = (tokenData as TokenData | null)?.usdValueVolume24h ?? 0;
  const highVolume = usdVolume24h >= 500_000;
  const locked = isTradesFetchLocked();
  if (locked) {
    if (tradesFetchModePaged) tradesFetchModePaged.checked = highVolume;
  }
  const usePaged = locked ? highVolume : (tradesFetchModePaged?.checked ?? getTradesFetchMode() === 'paged');

  const tradesPromise = (async () => {
    const buildTradesUrl = (opts: {
      limit: number;
      page?: number;
      timeStart?: number | null;
      timeEnd?: number | null;
    }): string => {
      const params = new URLSearchParams({
        mintAddress: mint,
        limit: String(opts.limit),
        sortByDesc: 'blockTime',
      });
      if (opts.page !== undefined) params.set('page', String(opts.page));
      if (opts.timeStart != null && opts.timeStart >= 0) params.set('timeStart', String(opts.timeStart));
      if (opts.timeEnd != null && opts.timeEnd >= 0) params.set('timeEnd', String(opts.timeEnd));
      return `/api/trades?${params.toString()}`;
    };

    const mergeBatchesInOrder = (batches: (TradeRow[] | null)[]): TradeRow[] => {
      const out: TradeRow[] = [];
      for (let p = 0; p < batches.length; p++) {
        const b = batches[p];
        if (b?.length) out.push(...b);
      }
      return out;
    };

    try {
      if (usePaged) {
        if (tradesSummaryHeading) tradesSummaryHeading.textContent = `Last ${TRADES_TOTAL} trades summary`;
        if (tradesSummaryLoadingText) tradesSummaryLoadingText.textContent = 'Loading… (0%)';
        const batches: (TradeRow[] | null)[] = Array(TRADES_TOTAL_PAGES).fill(null);
        let completedCount = 0;

        const fetchPage = async (page: number): Promise<void> => {
          const res = await fetchWithRetry(
            buildTradesUrl({ page, limit: TRADES_PAGE_SIZE })
          );
          const json = res.ok
            ? ((await res.json().catch(() => ({ data: [] }))) as { data?: TradeRow[] })
            : { data: [] };
          const data = json.data || [];
          batches[page] = data;
          const merged = mergeBatchesInOrder(batches);
          if (merged.length > 0) await processTradesAndRender(merged, mint, tokenData);
          completedCount++;
          if (tradesSummaryLoadingText) {
            tradesSummaryLoadingText.textContent = `Loading… (${Math.min(completedCount * 10, 100)}%)`;
          }
        };

        await fetchPage(0);
        await new Promise((r) => setTimeout(r, 1000));
        await Promise.all(
          Array.from({ length: TRADES_TOTAL_PAGES - 1 }, (_, i) => fetchPage(i + 1))
        );
      } else {
        if (tradesSummaryHeading) tradesSummaryHeading.textContent = 'Last trades summary';
        if (tradesSummaryLoadingText) tradesSummaryLoadingText.textContent = 'Loading…';
        const res = await fetchWithRetry(
          buildTradesUrl({ limit: 1000 })
        );
        const json = res.ok
          ? ((await res.json().catch(() => ({ data: [] }))) as { data?: TradeRow[] })
          : { data: [] };
        const trades = json.data || [];
        if (trades.length === 0) {
          tradesSummaryMeta.textContent = '—';
          tradesSummaryContent.innerHTML = emptyTradesSummaryHtml;
        } else {
          await processTradesAndRender(trades, mint, tokenData);
        }
      }
    } catch {
      showSectionError(tradesSummaryError, null, null);
      tradesSummaryMeta.textContent = '—';
      tradesSummaryContent.innerHTML = emptyTradesSummaryHtml;
    } finally {
      tradesSummaryLoading.hidden = true;
      tradesSummaryLoading.setAttribute('aria-hidden', 'true');
    }
  })();

  await Promise.allSettled([tokenPromise, topTradersPromise, holdersPromise, tradesPromise]);

  fetchAllBtn.disabled = false;
  loadingIndicator.hidden = true;
  loadingIndicator.setAttribute('aria-hidden', 'true');
  tokenSectionLoading.hidden = true;
  tradesSummaryLoading.hidden = true;
  topTradersLoading.hidden = true;
  holdersLoading.hidden = true;
});

const PUMP_MINT_FALLBACK_LOGO_URL =
  'https://s2.coinmarketcap.com/static/img/coins/64x64/36507.png';

function truncateMintMiddle(mint: string | undefined, head = 5, tail = 5): string {
  const m = (mint || '').trim();
  if (!m) return '';
  if (m.length <= head + tail + 4) return m;
  return `${m.slice(0, head)}....${m.slice(-tail)}`;
}

function escapeHtmlAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function escapeHtmlText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function resolveTokenLogoSrc(logoUrl: string | undefined, mintAddress: string | undefined): string {
  const trimmed = (logoUrl || '').trim();
  if (trimmed) return trimmed;
  const mint = (mintAddress || '').trim();
  if (mint.endsWith('pump')) return PUMP_MINT_FALLBACK_LOGO_URL;
  return '';
}

function parseLeadingZeroFraction(normalized: string): { zeroRun: number; sigRest: string } | null {
  const m = normalized.match(/^0\.(\d*)$/);
  if (!m) return null;
  const frac = m[1] ?? '';
  let i = 0;
  while (i < frac.length && frac[i] === '0') i++;
  if (i >= frac.length) return { zeroRun: frac.length, sigRest: '' };
  return { zeroRun: i, sigRest: frac.slice(i) };
}

function formatTokenStatPriceValueHtml(
  n: number | null | undefined,
  opts?: { usdSuffix?: boolean }
): string {
  if (n == null || !Number.isFinite(Number(n))) return escapeHtmlText('—');
  const raw = Number(n);
  const neg = raw < 0;
  const num = Math.abs(raw);
  const minus = neg ? '<span class="token-stat-price-neg">−</span>' : '';
  const suffix = opts?.usdSuffix ? '<span class="token-stat-price-suffix">USD</span>' : '';

  if (num === 0) {
    return `${minus}<span class="token-stat-row-price-num">0</span>${suffix}`;
  }
  if (num >= 1) {
    return `${minus}<span class="token-stat-row-price-num">${escapeHtmlText(formatPrice(neg ? -num : num))}</span>${suffix}`;
  }

  const s = num.toFixed(24).replace(/\.?0+$/, '');
  const parsed = parseLeadingZeroFraction(s);
  if (!parsed || parsed.sigRest.length === 0) {
    return `${minus}<span class="token-stat-row-price-num">${escapeHtmlText(formatPrice(neg ? -num : num))}</span>${suffix}`;
  }

  const { zeroRun, sigRest } = parsed;
  if (zeroRun === 0) {
    return `${minus}<span class="token-stat-row-price-num">${escapeHtmlText(formatPrice(neg ? -num : num))}</span>${suffix}`;
  }

  const mantissa = zeroRun <= 1 ? sigRest.slice(1, 5) : sigRest.slice(0, 4);
  return `${minus}<span class="token-stat-row-price-num token-stat-row-price-num--compact">0.0<sup class="token-price-zero-run">${String(zeroRun)}</sup>${escapeHtmlText(mantissa)}</span>${suffix}`;
}

function formatCategoryOverviewValueHtml(category: string | undefined, subcategory: string | undefined): string {
  const cat = (category ?? '').trim();
  const sub = (subcategory ?? '').trim();
  if (!cat && !sub) return escapeHtmlText('—');
  if (cat && sub) return escapeHtmlText(`${cat} (${sub})`);
  return escapeHtmlText(cat || sub);
}

function prefixTokenStatUsdDollar(priceHtml: string): string {
  if (priceHtml.includes('token-stat-price-neg')) {
    return priceHtml.replace(
      /^(<span class="token-stat-price-neg">[\s\S]*?<\/span>)/,
      `$1<span class="token-stat-usd-dollar" aria-hidden="true">$</span>`
    );
  }
  return `<span class="token-stat-usd-dollar" aria-hidden="true">$</span>${priceHtml}`;
}

function wrapTokenStatUsdHtml(innerHtml: string): string {
  return `<span class="token-stat-usd-value">${innerHtml}</span>`;
}

function wrapTokenStatUsdText(escapedPlain: string): string {
  return `<span class="token-stat-usd-value">${escapedPlain}</span>`;
}

function usdVolStatDisplayTier(refAbs: number): 'B' | 'M' | 'K' | 'raw' {
  const abs = Math.abs(refAbs);
  if (abs >= 1e9) return 'B';
  if (abs >= 1e6) return 'M';
  if (abs >= 1e3) return 'K';
  return 'raw';
}

function formatUsdVolStatAligned(value: number, tier: 'B' | 'M' | 'K' | 'raw'): string {
  let numPart: string;
  switch (tier) {
    case 'B':
      numPart = (value / 1e9).toFixed(2);
      break;
    case 'M':
      numPart = (value / 1e6).toFixed(2);
      break;
    case 'K':
      numPart = (value / 1e3).toFixed(2);
      break;
    default:
      numPart = value.toFixed(4);
  }
  numPart = numPart.replace(/\.?0+$/, '');
  const suf = tier === 'raw' ? '' : tier;
  return `${numPart}${suf}`;
}

function formatPctSmart(value: number): string {
  const num = Number(value);
  if (!Number.isFinite(num) || num === 0) return '0%';
  const abs = Math.abs(num);
  if (abs >= 0.01) return `${num.toFixed(2)}%`;
  const decimalsToFirstNonZero = Math.ceil(-Math.log10(abs));
  const decimals = Math.max(3, Math.min(8, decimalsToFirstNonZero));
  return `${num.toFixed(decimals)}%`;
}

type HistoricalPricePctPeriod = '24hr' | '7d';

function formatHistoricalPricePctVsSpotHtml(
  spot: number | undefined,
  historical: number | undefined,
  period: HistoricalPricePctPeriod
): string {
  if (spot == null || historical == null || !Number.isFinite(spot) || !Number.isFinite(historical) || spot === 0) {
    return '';
  }
  const pct = ((spot - historical) / spot) * 100;
  const toneClass =
    pct > 0 ? 'usd-tone usd-tone--positive' : pct < 0 ? 'usd-tone usd-tone--negative' : 'usd-tone usd-tone--neutral';
  const sign = pct > 0 ? '+' : '';
  const arrow = pct > 0 ? '↑' : pct < 0 ? '↓' : '';
  const pctSpan = `<span class="token-stat-price-pct ${toneClass}">${sign}${formatPctSmart(pct)}</span>`;
  const arrowSpan = arrow
    ? `<span class="token-stat-price-pct-arrow ${toneClass}" aria-hidden="true">${arrow}</span>`
    : '';
  const periodSpan = `<span class="token-stat-price-pct-period">${escapeHtmlText(period)}</span>`;
  const meta = `<span class="token-stat-price-pct-meta">${arrowSpan}${periodSpan}</span>`;
  return ` ${pctSpan}${meta}`;
}

const tokenSectionIcons: Record<string, string> = {
  overview:
    '<svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/></svg>',
  price:
    '<svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  supply:
    '<svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
};

type TokenStatRowKey =
  | 'mint'
  | 'decimals'
  | 'category'
  | 'verified'
  | 'priceUsd'
  | 'marketCap'
  | 'price1d'
  | 'price7d'
  | 'supply'
  | 'tokenVol24h'
  | 'usdVol24h';

interface TokenStatRow {
  key: TokenStatRowKey;
  label: string;
  valueHtml: string;
}

const TOKEN_STAT_ROW_ICONS: Record<TokenStatRowKey, string> = {
  mint:
    '<svg class="token-stat-row-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  decimals:
    '<svg class="token-stat-row-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><path d="M8 10h.01M12 10h.01M16 10h.01M8 14h8M8 18h5"/></svg>',
  category:
    '<svg class="token-stat-row-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
  verified:
    '<svg class="token-stat-row-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>',
  priceUsd:
    '<svg class="token-stat-row-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  marketCap:
    '<svg class="token-stat-row-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  price1d:
    '<svg class="token-stat-row-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  price7d:
    '<svg class="token-stat-row-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  supply:
    '<svg class="token-stat-row-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
  tokenVol24h:
    '<svg class="token-stat-row-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
  usdVol24h:
    '<svg class="token-stat-row-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
};

interface TokenStatSectionSpec {
  icon: string;
  title: string;
  theme: 'overview' | 'price' | 'supply';
  rows: TokenStatRow[];
}

function tokenStatRowHtml(row: TokenStatRow): string {
  const icon = TOKEN_STAT_ROW_ICONS[row.key];
  const aria = escapeHtmlAttr(row.label);
  return `<div class="token-stat-row token-stat-row--${row.key}" role="group" aria-label="${aria}">
    <div class="token-stat-row-icon" aria-hidden="true">${icon}</div>
    <div class="token-stat-row-body">
      <span class="token-stat-row-label">${escapeHtmlText(row.label)}</span>
      <span class="token-stat-row-value">${row.valueHtml}</span>
    </div>
  </div>`;
}

function tokenStatSectionHtml(s: TokenStatSectionSpec): string {
  const rows = s.rows.map((r) => tokenStatRowHtml(r)).join('');
  return `<section class="token-stats-group token-stats-group--${s.theme}">
      <h3 class="token-stats-group-title">${s.icon}<span>${s.title}</span></h3>
      <div class="token-stat-rows">${rows}</div>
    </section>`;
}

/** e.g. Saturday May 15, 2027 at 5:50PM */
function formatTokenUpdateTime(ts: number | undefined): string {
  if (ts == null) return '—';
  const d = new Date(ts * 1000);
  const weekday = d.toLocaleString('en-US', { weekday: 'long' });
  const month = d.toLocaleString('en-US', { month: 'long' });
  const day = d.getDate();
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const minuteStr = minutes < 10 ? `0${minutes}` : String(minutes);
  return `${weekday} ${month} ${day}, ${year} at ${hours}:${minuteStr}${ampm}`;
}

function buildTokenStatsPlaceholderHtml(): string {
  const d = escapeHtmlText('—');
  const overview: TokenStatSectionSpec = {
    icon: tokenSectionIcons.overview,
    title: 'Overview',
    theme: 'overview',
    rows: [
      { key: 'mint', label: 'Mint', valueHtml: `<span class="mono">${d}</span>` },
      { key: 'category', label: 'Category', valueHtml: d },
      { key: 'verified', label: 'Verified', valueHtml: d },
      { key: 'decimals', label: 'Decimals', valueHtml: d },
    ],
  };
  const priceSection: TokenStatSectionSpec = {
    icon: tokenSectionIcons.price,
    title: 'Price & market cap',
    theme: 'price',
    rows: [
      { key: 'priceUsd', label: 'Price (USD)', valueHtml: d },
      { key: 'marketCap', label: 'Market cap', valueHtml: d },
      { key: 'price1d', label: 'Price (24h ago)', valueHtml: d },
      { key: 'price7d', label: 'Price (7d ago)', valueHtml: d },
    ],
  };
  const supplyVolumeSection: TokenStatSectionSpec = {
    icon: tokenSectionIcons.supply,
    title: 'Supply & volume (24h)',
    theme: 'supply',
    rows: [
      { key: 'supply', label: 'Current supply', valueHtml: d },
      { key: 'tokenVol24h', label: 'Token volume (24h)', valueHtml: d },
      { key: 'usdVol24h', label: 'USD volume (24h)', valueHtml: d },
    ],
  };
  return tokenStatsMainRowHtml(overview, priceSection, supplyVolumeSection);
}

function tokenStatsMainRowHtml(
  overview: TokenStatSectionSpec,
  priceSection: TokenStatSectionSpec,
  supplyVolumeSection: TokenStatSectionSpec
): string {
  return `<div class="token-stats-row token-stats-row--split-overview"><div class="token-stats-col token-stats-col--overview">${tokenStatSectionHtml(overview)}</div><div class="token-stats-col token-stats-col--pair"><div class="token-stats-pair-grid">${tokenStatSectionHtml(priceSection)}<div class="token-stats-supply-stack">${tokenLastUpdatedRowHtml()}${tokenStatSectionHtml(supplyVolumeSection)}</div></div></div></div>`;
}

function renderToken(t: TokenData): void {
  const tokenLogoSrc = resolveTokenLogoSrc(t.logoUrl, t.mintAddress);
  tokenLogo.src = tokenLogoSrc;
  tokenLogo.alt = t.symbol || '';
  tokenLogo.style.display = tokenLogoSrc ? 'block' : 'none';
  tokenSymbol.textContent = t.symbol || '—';
  const nameTrim = (t.name || '').trim();
  const mintTrim = (t.mintAddress || '').trim();
  if (nameTrim) {
    tokenName.textContent = nameTrim;
    tokenName.removeAttribute('title');
  } else if (mintTrim) {
    tokenName.textContent = truncateMintMiddle(mintTrim);
    tokenName.title = mintTrim;
  } else {
    tokenName.textContent = '—';
    tokenName.removeAttribute('title');
  }

  const sym = (t.symbol || '').toUpperCase();
  const dashTxt = escapeHtmlText('—');
  const mintLink = mintTrim
    ? `<a href="${VYBE_TOKEN}${encodeURIComponent(mintTrim)}" target="_blank" rel="noopener" class="mono" title="${escapeHtmlAttr(mintTrim)}">${truncateMintMiddle(mintTrim)}</a>`
    : '';
  const decVal = t.decimal ?? t.decimals;
  const overview: TokenStatSectionSpec = {
    icon: tokenSectionIcons.overview,
    title: 'Overview',
    theme: 'overview',
    rows: [
      { key: 'mint', label: 'Mint', valueHtml: mintLink || dashTxt },
      {
        key: 'category',
        label: 'Category',
        valueHtml: formatCategoryOverviewValueHtml(t.category, t.subcategory),
      },
      {
        key: 'verified',
        label: 'Verified',
        valueHtml: t.verified != null ? escapeHtmlText(String(t.verified)) : dashTxt,
      },
      {
        key: 'decimals',
        label: 'Decimals',
        valueHtml: decVal != null ? escapeHtmlText(String(decVal)) : dashTxt,
      },
    ],
  };
  const priceSection: TokenStatSectionSpec = {
    icon: tokenSectionIcons.price,
    title: 'Price & market cap',
    theme: 'price',
    rows: [
      {
        key: 'priceUsd',
        label: 'Price (USD)',
        valueHtml:
          t.price != null
            ? wrapTokenStatUsdHtml(prefixTokenStatUsdDollar(formatTokenStatPriceValueHtml(t.price, { usdSuffix: true })))
            : dashTxt,
      },
      {
        key: 'marketCap',
        label: 'Market cap',
        valueHtml:
          t.marketCap != null
            ? wrapTokenStatUsdText(escapeHtmlText(`$${formatNum(t.marketCap)} USD`))
            : dashTxt,
      },
      {
        key: 'price1d',
        label: 'Price (24h ago)',
        valueHtml:
          t.price1d != null
            ? wrapTokenStatUsdHtml(prefixTokenStatUsdDollar(formatTokenStatPriceValueHtml(t.price1d))) +
              formatHistoricalPricePctVsSpotHtml(t.price, t.price1d, '24hr')
            : dashTxt,
      },
      {
        key: 'price7d',
        label: 'Price (7d ago)',
        valueHtml:
          t.price7d != null
            ? wrapTokenStatUsdHtml(prefixTokenStatUsdDollar(formatTokenStatPriceValueHtml(t.price7d))) +
              formatHistoricalPricePctVsSpotHtml(t.price, t.price7d, '7d')
            : dashTxt,
      },
    ],
  };
  const supplyVolumeSection: TokenStatSectionSpec = {
    icon: tokenSectionIcons.supply,
    title: 'Supply & volume (24h)',
    theme: 'supply',
    rows: [
      {
        key: 'supply',
        label: 'Current supply',
        valueHtml:
          t.currentSupply != null
            ? escapeHtmlText(`${formatNum(t.currentSupply)}${sym ? ` ${sym}` : ''}`)
            : dashTxt,
      },
      {
        key: 'tokenVol24h',
        label: 'Token volume (24h)',
        valueHtml:
          t.tokenAmountVolume24h != null
            ? escapeHtmlText(`${formatNum(t.tokenAmountVolume24h)}${sym ? ` ${sym}` : ''}`)
            : dashTxt,
      },
      {
        key: 'usdVol24h',
        label: 'USD volume (24h)',
        valueHtml:
          t.usdValueVolume24h != null && Number.isFinite(t.usdValueVolume24h)
            ? wrapTokenStatUsdText(
                escapeHtmlText(
                  `$${formatUsdVolStatAligned(t.usdValueVolume24h, usdVolStatDisplayTier(t.usdValueVolume24h))} USD`
                )
              )
            : dashTxt,
      },
    ],
  };

  tokenStats.innerHTML = tokenStatsMainRowHtml(overview, priceSection, supplyVolumeSection);
  setTokenLastUpdated(formatTokenUpdateTime(t.updateTime));
}

const SOLSCAN_ACCOUNT = 'https://solscan.io/account/';
const SOLSCAN_TOKEN = 'https://solscan.io/token/';
const VYBE_TOKEN = 'https://vybe.fyi/tokens/';
const VYBE_WALLET = 'https://vybe.fyi/wallets/';

function renderTradesSummary(opts: {
  tradesCount: number;
  uniqueProgramCount: number;
  programLabels: Record<string, string>;
  uniquePrograms: string[];
  programTradeCount: Record<string, number>;
  programTopMarkets?: Record<string, { marketAddress: string; bestQuoteMint: string | null }[]>;
  quoteSymbols: Record<string, string>;
  top10QuoteMints: { mint: string; count: number }[];
  top10Markets?: { marketAddress: string; count: number; bestQuoteMint: string | null }[];
  baseSymbol?: string;
}): void {
  const {
    tradesCount,
    uniqueProgramCount,
    programLabels,
    uniquePrograms,
    programTradeCount,
    programTopMarkets = {},
    quoteSymbols,
    top10QuoteMints,
    top10Markets = [],
    baseSymbol = '—',
  } = opts;
  const quoteCountWithSymbol = top10QuoteMints.length;
  tradesSummaryMeta.textContent = `From last ${tradesCount} trades: top ${uniqueProgramCount} program(s), top ${quoteCountWithSymbol} quote tokens, top ${top10Markets.length} markets by count.`;

  const programRows = uniquePrograms
    .filter((addr) => {
      const markets = programTopMarkets[addr] || [];
      const top = markets.find((m) => !m.bestQuoteMint || hasQuoteSymbol(m.bestQuoteMint, quoteSymbols));
      return !!top;
    })
    .map((addr) => {
      const labelCell = hasRealLabel(programLabels, addr) ? programLabels[addr] : '—';
      const count = programTradeCount[addr] ?? 0;
      const link = `<a href="${SOLSCAN_ACCOUNT}${encodeURIComponent(addr)}" target="_blank" rel="noopener" class="mono" title="${addr}">${truncateProgramAddress(addr)}</a>`;
      const markets = programTopMarkets[addr] || [];
      const top = markets.find((m) => !m.bestQuoteMint || hasQuoteSymbol(m.bestQuoteMint, quoteSymbols))!;
      const marketLink = `<a href="${SOLSCAN_ACCOUNT}${encodeURIComponent(top.marketAddress)}" target="_blank" rel="noopener" class="mono" title="${top.marketAddress}">${truncateAddress(top.marketAddress)}</a>`;
      const baseSymDisplay = truncateSymbolDisplay(baseSymbol);
      const quoteSymDisplay = top.bestQuoteMint ? truncateSymbolDisplay(quoteDisplay(top.bestQuoteMint, quoteSymbols)) : '';
      const pairDisplay = top.bestQuoteMint ? `${baseSymDisplay} / ${quoteSymDisplay}` : '';
      const topMarketCell = pairDisplay ? `${marketLink} (${pairDisplay})` : marketLink;
      return `<tr><td>${labelCell}</td><td>${link}</td><td>${topMarketCell}</td><td>${count}</td></tr>`;
    })
    .join('');
  const quoteRows = top10QuoteMints
    .map(({ mint, count }) => {
      const mintLink = `<a href="${VYBE_TOKEN}${encodeURIComponent(mint)}" target="_blank" rel="noopener" class="mono" title="${mint}">${truncateAddress(mint)}</a>`;
      const sym = truncateSymbolDisplay(quoteDisplay(mint, quoteSymbols));
      return `<tr><td>${sym}</td><td>${mintLink}</td><td>${count}</td></tr>`;
    })
    .join('');
  const marketRows = top10Markets
    .map(({ marketAddress, count, bestQuoteMint }) => {
      const marketLink = `<a href="${SOLSCAN_ACCOUNT}${encodeURIComponent(marketAddress)}" target="_blank" rel="noopener" class="mono" title="${marketAddress}">${truncateAddress(marketAddress)}</a>`;
      const baseSymDisplay = truncateSymbolDisplay(baseSymbol);
      const quoteSymDisplay = bestQuoteMint ? truncateSymbolDisplay(quoteDisplay(bestQuoteMint, quoteSymbols)) : '';
      const pairDisplay = bestQuoteMint ? `${baseSymDisplay} / ${quoteSymDisplay}` : '—';
      return `<tr><td>${marketLink}</td><td>${pairDisplay}</td><td>${count}</td></tr>`;
    })
    .join('');

  tradesSummaryContent.innerHTML = `
    <div class="trades-summary-grid">
      <div class="trades-summary-block trades-summary-quotes">
        <h3 class="trades-summary-subtitle">Quote tokens (top 10)</h3>
        <div class="table-wrap">
          <table class="trades-summary-table">
            <thead><tr><th>Symbol</th><th>Mint</th><th>Count</th></tr></thead>
            <tbody>${quoteRows}</tbody>
          </table>
        </div>
      </div>
      <div class="trades-summary-block trades-summary-markets">
        <h3 class="trades-summary-subtitle">Top markets (top 10)</h3>
        <div class="table-wrap">
          <table class="trades-summary-table">
            <thead><tr><th>Market address</th><th>Pair</th><th>Count</th></tr></thead>
            <tbody>${marketRows || '<tr><td>—</td><td>—</td><td>—</td></tr>'}</tbody>
          </table>
        </div>
      </div>
      <div class="trades-summary-block trades-summary-programs trades-summary-programs-fullrow">
        <h3 class="trades-summary-subtitle">Programs (top 10)</h3>
        <div class="table-wrap">
          <table class="trades-summary-table">
            <colgroup><col class="col-label"><col class="col-address"><col class="col-top-market"><col class="col-count"></colgroup>
            <thead><tr><th>Label</th><th>Program address</th><th>Top Market</th><th>Count</th></tr></thead>
            <tbody>${programRows}</tbody>
          </table>
        </div>
      </div>
    </div>`;
}

function renderTopTraders(data: { data?: TopTraderRow[] }): void {
  const list = data.data || [];
  topTradersMeta.textContent = list.length
    ? `Top 100 traders by realized PnL (30d, this token; ${list.length} shown).`
    : '—';

  topTradersBody.innerHTML = list.length
    ? list
        .map((row, i) => {
          const rank = i + 1;
          const addr = row.accountAddress;
          const display = row.accountName || (addr ? truncateAddress(addr) : '—');
          const accountLink = addr
            ? `<a href="${VYBE_WALLET}${encodeURIComponent(addr)}" target="_blank" rel="noopener" class="mono" title="${addr}">${display}</a>`
            : `<span class="mono">${display}</span>`;
          const m = row.metrics || {};
          const realizedPnl = m.realizedPnlUsd != null ? formatUsdFull(Number(m.realizedPnlUsd)) : '—';
          const tradesCount = m.tradesCount != null ? formatInt(Number(m.tradesCount)) : '—';
          const volumeUsd = m.tradesVolumeUsd != null ? formatUsdFull(Number(m.tradesVolumeUsd)) : '—';
          const winRate =
            m.winRate != null
              ? Number(m.winRate) < 1
                ? `${Number(m.winRate).toFixed(2)}%`
                : `${Math.round(Number(m.winRate))}%`
              : '—';
          return `<tr>
        <td>${rank}</td>
        <td>${accountLink}</td>
        <td>${realizedPnl}</td>
        <td style="text-align:right">${tradesCount}</td>
        <td style="text-align:right">${volumeUsd}</td>
        <td style="text-align:right">${winRate}</td>
      </tr>`;
        })
        .join('')
    : '<tr><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>';
}

function renderHolders(data: { data?: HolderRow[] }): void {
  const list = data.data || [];
  holdersMeta.textContent = list.length
    ? `Top 100 holders sorted by highest % of supply (${list.length} shown; updated every 3 hours).`
    : '—';

  holdersBody.innerHTML = list.length
    ? list
        .map((h) => {
          const rank = h.rank ?? '—';
          const ownerDisplay = h.ownerName || (h.ownerAddress ? truncateAddress(h.ownerAddress) : '—');
          const ownerLink = h.ownerAddress
            ? `<a href="${VYBE_WALLET}${encodeURIComponent(h.ownerAddress)}" target="_blank" rel="noopener" class="mono" title="${h.ownerAddress}">${ownerDisplay}</a>`
            : `<span class="mono">${ownerDisplay}</span>`;
          const rawSym = tokenSymbol?.textContent ? tokenSymbol.textContent.trim().toUpperCase() : '';
          const sym = rawSym ? truncateSymbolDisplay(rawSym) : '';
          const balance =
            h.balance != null && h.balance !== ''
              ? formatBalance(Number(h.balance), sym)
              : '—';
          const valueUsd = h.valueUsd != null ? formatNum(Number(h.valueUsd)) : '—';
          const pct =
            h.percentageOfSupplyHeld != null
              ? `${Number(h.percentageOfSupplyHeld).toFixed(2)}%`
              : '—';
          return `<tr>
        <td>${rank}</td>
        <td>${ownerLink}</td>
        <td style="text-align:left">${balance}</td>
        <td style="text-align:right">${valueUsd}</td>
        <td style="text-align:right">${pct}</td>
      </tr>`;
        })
        .join('')
    : '<tr><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>';
}

function renderEmptyState(): void {
  tokenSymbol.textContent = '—';
  tokenName.textContent = '—';
  tokenName.removeAttribute('title');
  tokenLogo.style.display = 'none';
  tokenLogo.src = '';
  tokenLogo.alt = '';
  tokenStats.innerHTML = buildTokenStatsPlaceholderHtml();
  setTokenLastUpdated('—');

  tradesSummaryMeta.textContent = '—';
  tradesSummaryContent.innerHTML = `
    <div class="trades-summary-grid">
      <div class="trades-summary-block trades-summary-quotes">
        <h3 class="trades-summary-subtitle">Quote tokens (top 10)</h3>
        <div class="table-wrap">
          <table class="trades-summary-table">
            <thead><tr><th>Symbol</th><th>Mint</th><th>Count</th></tr></thead>
            <tbody><tr><td>—</td><td>—</td><td>—</td></tbody>
          </table>
        </div>
      </div>
      <div class="trades-summary-block trades-summary-markets">
        <h3 class="trades-summary-subtitle">Top markets (top 10)</h3>
        <div class="table-wrap">
          <table class="trades-summary-table">
            <thead><tr><th>Market address</th><th>Pair</th><th>Count</th></tr></thead>
            <tbody><tr><td>—</td><td>—</td><td>—</td></tr></tbody>
          </table>
        </div>
      </div>
      <div class="trades-summary-block trades-summary-programs trades-summary-programs-fullrow">
        <h3 class="trades-summary-subtitle">Programs (top 10)</h3>
        <div class="table-wrap">
          <table class="trades-summary-table">
            <colgroup><col class="col-label"><col class="col-address"><col class="col-top-market"><col class="col-count"></colgroup>
            <thead><tr><th>Label</th><th>Program address</th><th>Top Market</th><th>Count</th></tr></thead>
            <tbody><tr><td>—</td><td>—</td><td>—</td><td>—</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>`;

  topTradersMeta.textContent = '—';
  topTradersBody.innerHTML =
    '<tr><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>';
  holdersMeta.textContent = '—';
  holdersBody.innerHTML = '<tr><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>';
  tokenSectionLoading.hidden = true;
  tradesSummaryLoading.hidden = true;
  topTradersLoading.hidden = true;
  holdersLoading.hidden = true;
  hideSectionError(tokenSectionError);
  hideSectionError(tradesSummaryError);
  hideSectionError(topTradersError);
  hideSectionError(holdersError);
}

if (tradesFetchLock) {
  tradesFetchLock.addEventListener('mouseleave', () => {
    tradesFetchLock.classList.remove('trades-fetch-lock--no-hover');
  });
  tradesFetchLock.addEventListener('click', () => {
    tradesFetchLock.classList.add('trades-fetch-lock--no-hover');
    const locked = isTradesFetchLocked();
    setTradesFetchLocked(!locked);
    applyTradesFetchUI();
  });
}

if (tradesFetchModePaged && tradesFetchSwitchLabel) {
  tradesFetchModePaged.addEventListener('change', () => {
    if (!isTradesFetchLocked()) {
      setTradesFetchMode(tradesFetchModePaged.checked ? 'paged' : 'single');
    }
  });
}

applyTradesFetchUI();
renderEmptyState();

void (async () => {
  try {
    if (!mintInput.value.trim()) {
      mintInput.value = DEMO_MINT;
    }
    const res = await fetch(DEMO_SNAPSHOT_URL);
    if (!res.ok) return;
    const snapshot = (await res.json()) as {
      mintAddress?: string;
      token?: TokenData;
      trades?: TradeRow[];
      topTraders?: { data?: TopTraderRow[] };
      topHolders?: { data?: HolderRow[] };
      programLabels?: Record<string, string>;
      quoteSymbols?: Record<string, string>;
    };
    const mint = (mintInput.value || snapshot.mintAddress || DEMO_MINT).trim();
    const token = snapshot.token ?? null;
    if (token) {
      renderToken(token);
      hideSectionError(tokenSectionError);
    }
    const trades = snapshot.trades ?? [];
    if (trades.length > 0) {
      await processTradesAndRender(trades, mint, token, {
        programLabels: snapshot.programLabels,
        quoteSymbols: snapshot.quoteSymbols,
      });
      hideSectionError(tradesSummaryError);
    }
    if (snapshot.topTraders) {
      renderTopTraders(snapshot.topTraders);
      hideSectionError(topTradersError);
    }
    if (snapshot.topHolders) {
      renderHolders(snapshot.topHolders);
      hideSectionError(holdersError);
    }
  } catch {
    // Snapshot is best-effort; ignore failures.
  } finally {
    tokenSectionLoading.hidden = true;
    tokenSectionLoading.setAttribute('aria-hidden', 'true');
    tradesSummaryLoading.hidden = true;
    tradesSummaryLoading.setAttribute('aria-hidden', 'true');
    topTradersLoading.hidden = true;
    topTradersLoading.setAttribute('aria-hidden', 'true');
    holdersLoading.hidden = true;
    holdersLoading.setAttribute('aria-hidden', 'true');
  }
})();
