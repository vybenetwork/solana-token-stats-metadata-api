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
const tokenStats = document.getElementById('tokenStats') as HTMLElement;
const tradesSummarySection = document.getElementById('tradesSummarySection');
const tradesSummaryLoading = document.getElementById('tradesSummaryLoading') as HTMLElement;
const tradesSummaryLoadingText = document.getElementById('tradesSummaryLoadingText') as HTMLElement;
const tradesSummaryError = document.getElementById('tradesSummaryError') as HTMLElement;
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
  tokenData: TokenData | null
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
  const needSymbolMints = sortedByCount
    .slice(0, 20)
    .map(([mintAddr]) => mintAddr)
    .filter((mintAddr) => !HARDCODED_QUOTE_SYMBOLS[mintAddr]);
  const uniquePrograms = [...new Set(trades.map((t) => t.programAddress).filter(Boolean))] as string[];
  const top10Programs = uniquePrograms
    .sort((a, b) => (programTradeCount[b] ?? 0) - (programTradeCount[a] ?? 0))
    .slice(0, 10);
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
  const programLabels: Record<string, string> = {};
  top10Programs.forEach((addr) => {
    programLabels[addr] = WELL_KNOWN_PROGRAMS[addr] || addr;
  });
  if (labelsRes.ok) {
    const body = (await labelsRes.json()) as { labels?: Record<string, string> };
    Object.assign(programLabels, body.labels || {});
  }
  const quoteSymbols: Record<string, string> = { ...HARDCODED_QUOTE_SYMBOLS };
  if (symbolsRes.ok) {
    const body = (await symbolsRes.json()) as { symbols?: Record<string, string> };
    Object.assign(quoteSymbols, body.symbols || {});
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

  const holdersPromise = fetchWithRetry(holdersUrl)
    .then(async (holdersRes) => {
      hideSectionError(holdersError);
      if (!holdersRes.ok) {
        const errData = (await holdersRes.json?.().catch(() => ({}))) ?? {};
        showSectionError(holdersError, holdersRes, errData);
      }
      const holdersData = holdersRes.ok
        ? (await holdersRes.json().catch(() => ({ data: [] }))) as { data?: HolderRow[] }
        : { data: [] };
      if (holdersRes.ok && holdersData.data?.length) {
        renderHolders(holdersData);
        hideSectionError(holdersError);
      } else {
        holdersMeta.textContent = '—';
        holdersBody.innerHTML = '<tr><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>';
      }
      holdersLoading.hidden = true;
      holdersLoading.setAttribute('aria-hidden', 'true');
    })
    .catch(() => {
      holdersLoading.hidden = true;
      holdersLoading.setAttribute('aria-hidden', 'true');
    });

  await tokenPromise;

  const tradesSummaryHeading = tradesSummarySection?.querySelector('.section-header h2');
  const usdVolume24h = (tokenData as TokenData | null)?.usdValueVolume24h ?? 0;
  const highVolume = usdVolume24h >= 500_000;

  const tradesPromise = (async () => {
    const buildTradesUrl = (opts: {
      page: number;
      limit: number;
      timeStart?: number | null;
      timeEnd?: number | null;
    }): string => {
      const params = new URLSearchParams({
        mintAddress: mint,
        limit: String(opts.limit),
        page: String(opts.page),
        sortByDesc: 'blockTime',
      });
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
      if (highVolume) {
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

        await Promise.all(
          Array.from({ length: TRADES_TOTAL_PAGES }, (_, p) => fetchPage(p))
        );
      } else {
        if (tradesSummaryHeading) tradesSummaryHeading.textContent = 'Last trades summary';
        const res = await fetchWithRetry(
          buildTradesUrl({ page: 0, limit: 1000 })
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

const tokenSectionIcons: Record<string, string> = {
  overview:
    '<svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/></svg>',
  price:
    '<svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  supply:
    '<svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
  volume:
    '<svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>',
  meta:
    '<svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
};

interface SectionSpec {
  icon: string;
  title: string;
  rows: [string, string | number | undefined][];
}

function renderToken(t: TokenData): void {
  tokenLogo.src = t.logoUrl || '';
  tokenLogo.alt = t.symbol || '';
  tokenLogo.style.display = t.logoUrl ? 'block' : 'none';
  tokenSymbol.textContent = t.symbol || '—';
  tokenName.textContent = t.name || t.mintAddress || '—';

  function sectionHtml(s: SectionSpec): string {
    return `<section class="token-stats-group">
      <h3 class="token-stats-group-title">${s.icon}<span>${s.title}</span></h3>
      <dl class="token-stats">${s.rows
        .map(([label, value]) => `<dt>${label}</dt><dd>${value ?? '—'}</dd>`)
        .join('')}</dl>
    </section>`;
  }

  const sym = (t.symbol || '').toUpperCase();
  const formatUpdateTime = (ts: number | undefined): string => {
    if (ts == null) return '—';
    const d = new Date(ts * 1000);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const mintLink = t.mintAddress
    ? `<a href="${SOLSCAN_TOKEN}${encodeURIComponent(t.mintAddress)}" target="_blank" rel="noopener noreferrer" class="mono" title="${t.mintAddress}">${t.mintAddress}</a>`
    : '—';
  const overview: SectionSpec = {
    icon: tokenSectionIcons.overview,
    title: 'Overview',
    rows: [
      ['Mint', mintLink],
      ['Symbol', sym || '—'],
      ['Decimals', t.decimal ?? t.decimals],
      ['Category', t.category ?? '—'],
      ['Subcategory', t.subcategory ?? '—'],
      ['Verified', t.verified != null ? String(t.verified) : '—'],
    ],
  };
  const priceSection: SectionSpec = {
    icon: tokenSectionIcons.price,
    title: 'Price & market cap',
    rows: [
      ['Price (USD)', t.price != null ? `${formatPrice(t.price)} USD` : '—'],
      ['Market cap', t.marketCap != null ? `${formatNum(t.marketCap)} USD` : '—'],
      ['Price (1d ago)', t.price1d != null ? formatPrice(t.price1d) : '—'],
      ['Price (7d ago)', t.price7d != null ? formatPrice(t.price7d) : '—'],
    ],
  };
  const supplyVolumeSection: SectionSpec = {
    icon: tokenSectionIcons.supply,
    title: 'Supply & volume (24h)',
    rows: [
      [
        'Current supply',
        t.currentSupply != null ? `${formatNum(t.currentSupply)}${sym ? ` ${sym}` : ''}` : '—',
      ],
      [
        'Token volume (24h)',
        t.tokenAmountVolume24h != null
          ? `${formatNum(t.tokenAmountVolume24h)}${sym ? ` ${sym}` : ''}`
          : '—',
      ],
      ['USD volume (24h)', t.usdValueVolume24h != null ? `${formatNum(t.usdValueVolume24h)} USD` : '—'],
    ],
  };
  const metaSection: SectionSpec = {
    icon: tokenSectionIcons.meta,
    title: 'Last updated',
    rows: [['Update time', formatUpdateTime(t.updateTime)]],
  };

  tokenStats.innerHTML =
    sectionHtml(overview) +
    `<div class="token-stats-row">
      <div class="token-stats-col">${sectionHtml(priceSection)}</div>
      <div class="token-stats-col">${sectionHtml(supplyVolumeSection)}</div>
    </div>` +
    sectionHtml(metaSection);
}

const SOLSCAN_ACCOUNT = 'https://solscan.io/account/';
const SOLSCAN_TOKEN = 'https://solscan.io/token/';

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
      const link = `<a href="${SOLSCAN_ACCOUNT}${encodeURIComponent(addr)}" target="_blank" rel="noopener noreferrer" class="mono" title="${addr}">${truncateProgramAddress(addr)}</a>`;
      const markets = programTopMarkets[addr] || [];
      const top = markets.find((m) => !m.bestQuoteMint || hasQuoteSymbol(m.bestQuoteMint, quoteSymbols))!;
      const marketLink = `<a href="${SOLSCAN_ACCOUNT}${encodeURIComponent(top.marketAddress)}" target="_blank" rel="noopener noreferrer" class="mono" title="${top.marketAddress}">${truncateAddress(top.marketAddress)}</a>`;
      const pairDisplay = top.bestQuoteMint ? `${baseSymbol} / ${quoteDisplay(top.bestQuoteMint, quoteSymbols)}` : '';
      const topMarketCell = pairDisplay ? `${marketLink} (${pairDisplay})` : marketLink;
      return `<tr><td>${labelCell}</td><td>${link}</td><td>${topMarketCell}</td><td>${count}</td></tr>`;
    })
    .join('');
  const quoteRows = top10QuoteMints
    .map(({ mint, count }) => {
      const mintLink = `<a href="${SOLSCAN_TOKEN}${encodeURIComponent(mint)}" target="_blank" rel="noopener noreferrer" class="mono" title="${mint}">${truncateAddress(mint)}</a>`;
      return `<tr><td>${quoteDisplay(mint, quoteSymbols)}</td><td>${mintLink}</td><td>${count}</td></tr>`;
    })
    .join('');
  const marketRows = top10Markets
    .map(({ marketAddress, count, bestQuoteMint }) => {
      const marketLink = `<a href="${SOLSCAN_ACCOUNT}${encodeURIComponent(marketAddress)}" target="_blank" rel="noopener noreferrer" class="mono" title="${marketAddress}">${truncateAddress(marketAddress)}</a>`;
      const pairDisplay = bestQuoteMint ? `${baseSymbol} / ${quoteDisplay(bestQuoteMint, quoteSymbols)}` : '—';
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
            ? `<a href="${SOLSCAN_ACCOUNT}${encodeURIComponent(addr)}" target="_blank" rel="noopener noreferrer" class="mono" title="${addr}">${display}</a>`
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
            ? `<a href="${SOLSCAN_ACCOUNT}${encodeURIComponent(h.ownerAddress)}" target="_blank" rel="noopener noreferrer" class="mono" title="${h.ownerAddress}">${ownerDisplay}</a>`
            : `<span class="mono">${ownerDisplay}</span>`;
          const sym = tokenSymbol?.textContent ? tokenSymbol.textContent.trim().toUpperCase() : '';
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
  tokenLogo.style.display = 'none';
  tokenLogo.src = '';
  tokenLogo.alt = '';

  const dash = (label: string) => `<dt>${label}</dt><dd>—</dd>`;
  const sectionHtml = (
    icon: string,
    title: string,
    rows: [string, string | number | undefined][]
  ) =>
    `<section class="token-stats-group">
      <h3 class="token-stats-group-title">${icon}<span>${title}</span></h3>
      <dl class="token-stats">${rows.map(([l]) => dash(l)).join('')}</dl>
    </section>`;

  const overviewRows: [string, string | number | undefined][] = [
    ['Mint', undefined],
    ['Symbol', undefined],
    ['Decimals', undefined],
    ['Category', undefined],
    ['Subcategory', undefined],
    ['Verified', undefined],
  ];
  const priceRows: [string, string | number | undefined][] = [
    ['Price (USD)', undefined],
    ['Market cap', undefined],
    ['Price (1d ago)', undefined],
    ['Price (7d ago)', undefined],
  ];
  const supplyRows: [string, string | number | undefined][] = [
    ['Current supply', undefined],
    ['Token volume (24h)', undefined],
    ['USD volume (24h)', undefined],
  ];
  const metaRows: [string, string | number | undefined][] = [['Update time', undefined]];

  tokenStats.innerHTML =
    sectionHtml(tokenSectionIcons.overview, 'Overview', overviewRows) +
    `<div class="token-stats-row">
      <div class="token-stats-col">${sectionHtml(tokenSectionIcons.price, 'Price & market cap', priceRows)}</div>
      <div class="token-stats-col">${sectionHtml(tokenSectionIcons.supply, 'Supply & volume (24h)', supplyRows)}</div>
    </div>` +
    sectionHtml(tokenSectionIcons.meta, 'Last updated', metaRows);

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

renderEmptyState();
