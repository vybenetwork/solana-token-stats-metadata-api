const mintInput = document.getElementById('mint');
const fetchAllBtn = document.getElementById('fetchAll');
const tokenSection = document.getElementById('tokenSection');
const tokenLogo = document.getElementById('tokenLogo');
const tokenSymbol = document.getElementById('tokenSymbol');
const tokenName = document.getElementById('tokenName');
const tokenStats = document.getElementById('tokenStats');
const tradesSummarySection = document.getElementById('tradesSummarySection');
const tradesSummaryMeta = document.getElementById('tradesSummaryMeta');
const tradesSummaryContent = document.getElementById('tradesSummaryContent');
const holdersSection = document.getElementById('holdersSection');
const holdersMeta = document.getElementById('holdersMeta');
const holdersBody = document.getElementById('holdersBody');
const errorSection = document.getElementById('errorSection');
const errorText = document.getElementById('errorText');

/** Well-known DEX program IDs → label (used when /api/programs has no match). */
const WELL_KNOWN_PROGRAMS = {
  '675kPX9MHTjS2zt1qwr1sgbV5tjF6n5paF8GcaxHfL8r': 'Raydium',
  '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP': 'Orca',
  '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P': 'Pump.fun',
  'EewxydAPCCVuNEyrVN68PuSYdQ7wKn27V9Gje1wcB3NH': 'Orca (Whirlpool)',
  'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK': 'Raydium CLMM',
  'PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY': 'Phoenix',
  'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo': 'Meteora',
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4': 'Jupiter',
};
let programsCache = null;

/** Hardcoded quote symbols: no fetch for these mints. */
const HARDCODED_QUOTE_SYMBOLS = {
  So11111111111111111111111111111111111111112: 'WSOL',
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 'USDC',
};

function truncateAddress(addr) {
  if (!addr || addr.length <= 12) return addr;
  return addr.slice(0, 4) + '....' + addr.slice(-4);
}

function truncateProgramAddress(addr) {
  if (!addr || addr.length <= 14) return addr;
  return addr.slice(0, 5) + '....' + addr.slice(-6);
}

function hasRealLabel(programLabels, addr) {
  const label = programLabels[addr];
  return label && label !== addr;
}

function hasQuoteSymbol(mint, quoteSymbols) {
  const s = HARDCODED_QUOTE_SYMBOLS[mint] || quoteSymbols[mint];
  return !!(s && s !== mint && s.length < 25);
}

function quoteDisplay(mint, quoteSymbols) {
  const s = HARDCODED_QUOTE_SYMBOLS[mint] || quoteSymbols[mint];
  if (s && s !== mint && s.length < 25) return s;
  return truncateAddress(mint);
}

function showError(msg) {
  errorText.textContent = typeof msg === 'object' ? JSON.stringify(msg, null, 2) : msg;
  errorSection.hidden = false;
}

function clearError() {
  errorSection.hidden = true;
}

function formatNum(n) {
  if (n == null) return '—';
  if (typeof n === 'number') {
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
    return n.toFixed(4);
  }
  return String(n);
}

/** Price formatting: no trailing zeros. >=1 → 2 decimals (424.00→424, 424.50→424.50); 0.0099 < x < 1 → 4 decimals; ≤0.0099 → up to 12 decimals. */
function formatPrice(n) {
  if (n == null) return '—';
  const num = Number(n);
  if (Number.isNaN(num)) return '—';
  const trim = (s) => s.replace(/\.?0+$/, '') || '0';
  if (num >= 1) {
    const s = num.toFixed(2);
    return s.endsWith('.00') ? s.replace(/\.00$/, '') : s;
  }
  if (num > 0.0099) return trim(num.toFixed(4));
  return trim(num.toFixed(12));
}

const loadingIndicator = document.getElementById('loadingIndicator');

const MAX_FETCH_RETRIES = 5;
const FETCH_RETRY_DELAY_MS = 2000;

async function fetchWithRetry(url, options = {}) {
  let lastErr;
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

fetchAllBtn.addEventListener('click', async () => {
  const mint = mintInput.value.trim();
  if (!mint) return;
  clearError();
  fetchAllBtn.disabled = true;
  loadingIndicator.hidden = false;
  loadingIndicator.setAttribute('aria-hidden', 'false');
  try {
    // Token details first, then trades + other, then top holders last (to space out requests)
    const tokenRes = await fetchWithRetry(`/api/tokens/${encodeURIComponent(mint)}`);
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) throw tokenData;
    renderToken(tokenData);

    await new Promise((r) => setTimeout(r, 2000));

    const tradesRes = await fetchWithRetry(
      `/api/trades?baseMintAddress=${encodeURIComponent(mint)}&limit=1000&sortByDesc=blockTime`
    );
    const tradesData = tradesRes.ok ? await tradesRes.json() : { data: [] };
    const trades = tradesData.data || [];

    if (trades.length > 0) {
      const quoteCountByMint = {};
      const programQuoteCounts = {};
      const programTradeCount = {};
      trades.forEach((t) => {
        const q = t.quoteMintAddress;
        const p = t.programAddress;
        if (q) quoteCountByMint[q] = (quoteCountByMint[q] || 0) + 1;
        if (p) programTradeCount[p] = (programTradeCount[p] || 0) + 1;
        if (p && q) {
          if (!programQuoteCounts[p]) programQuoteCounts[p] = {};
          programQuoteCounts[p][q] = (programQuoteCounts[p][q] || 0) + 1;
        }
      });

      const sortedByCount = Object.entries(quoteCountByMint).sort((a, b) => b[1] - a[1]);
      const quoteSymbols = {};
      const displayList = [];
      let idx = 0;
      while (displayList.length < 10 && idx < sortedByCount.length) {
        const batch = sortedByCount.slice(idx, idx + 10);
        for (const [mint, count] of batch) {
          if (HARDCODED_QUOTE_SYMBOLS[mint]) {
            quoteSymbols[mint] = HARDCODED_QUOTE_SYMBOLS[mint];
          } else {
            try {
              const r = await fetchWithRetry(`/api/token-symbol/${encodeURIComponent(mint)}`);
              const d = r.ok ? await r.json() : {};
              quoteSymbols[mint] = d.symbol || mint;
            } catch {
              quoteSymbols[mint] = mint;
            }
            await new Promise((r) => setTimeout(r, 300));
          }
          if (hasQuoteSymbol(mint, quoteSymbols)) {
            displayList.push({ mint, count });
            if (displayList.length >= 10) break;
          }
        }
        idx += 10;
      }
      const top10QuoteMintsWithSymbol = displayList.slice(0, 10);

      const uniquePrograms = [...new Set(trades.map((t) => t.programAddress).filter(Boolean))];
      const top10Programs = uniquePrograms
        .sort((a, b) => (programTradeCount[b] ?? 0) - (programTradeCount[a] ?? 0))
        .slice(0, 10);

      let programsList = programsCache;
      if (!programsList) {
        try {
          const progRes = await fetchWithRetry('/api/programs');
          programsList = progRes.ok ? await progRes.json() : { data: [] };
          programsCache = programsList;
        } catch {
          programsList = { data: [] };
        }
      }

      const programLabels = {};
      const programList = programsList.data || programsList.programs || [];
      if (Array.isArray(programList)) {
        programList.forEach((p) => {
          const id = p.id || p.address || p.programAddress;
          const name = p.name || p.label || p.symbol;
          if (id && name) programLabels[id] = name;
        });
      }
      top10Programs.forEach((addr) => {
        if (!programLabels[addr]) programLabels[addr] = WELL_KNOWN_PROGRAMS[addr] || addr;
      });

      renderTradesSummary({
        tradesCount: trades.length,
        uniqueProgramCount: top10Programs.length,
        programLabels,
        uniquePrograms: top10Programs,
        programTradeCount,
        quoteSymbols,
        top10QuoteMints: top10QuoteMintsWithSymbol,
      });
    } else {
      tradesSummaryMeta.textContent = '—';
      tradesSummaryContent.innerHTML = `
    <div class="trades-summary-grid">
      <div class="trades-summary-block trades-summary-programs">
        <h3 class="trades-summary-subtitle">Programs (top 10)</h3>
        <div class="table-wrap">
          <table class="trades-summary-table">
            <colgroup><col class="col-label"><col class="col-address"><col class="col-count"></colgroup>
            <thead><tr><th>Label</th><th>Program address</th><th>Count</th></tr></thead>
            <tbody><tr><td>—</td><td>—</td><td>—</td></tr></tbody>
          </table>
        </div>
      </div>
      <div class="trades-summary-block trades-summary-quotes">
        <h3 class="trades-summary-subtitle">Quote tokens (top 10)</h3>
        <div class="table-wrap">
          <table class="trades-summary-table">
            <thead><tr><th>Symbol</th><th>Mint</th><th>Count</th></tr></thead>
            <tbody><tr><td>—</td><td>—</td><td>—</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>`;
    }

    await new Promise((r) => setTimeout(r, 2000));

    const holdersRes = await fetchWithRetry(
      `/api/tokens/${encodeURIComponent(mint)}/top-holders?page=0&limit=100&sortByDesc=percentageOfSupplyHeld`
    );
    const holdersData = await holdersRes.json();
    if (holdersRes.ok && holdersData.data?.length) {
      renderHolders(holdersData);
    } else {
      holdersMeta.textContent = '—';
      holdersBody.innerHTML = '<tr><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>';
    }
  } catch (e) {
    showError(e.message || e);
  } finally {
    fetchAllBtn.disabled = false;
    loadingIndicator.hidden = true;
    loadingIndicator.setAttribute('aria-hidden', 'true');
  }
});

const tokenSectionIcons = {
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

function renderToken(t) {
  tokenLogo.src = t.logoUrl || '';
  tokenLogo.alt = t.symbol || '';
  tokenLogo.style.display = t.logoUrl ? 'block' : 'none';
  tokenSymbol.textContent = t.symbol || '—';
  tokenName.textContent = t.name || t.mintAddress || '—';

  function sectionHtml(s) {
    return `<section class="token-stats-group">
      <h3 class="token-stats-group-title">${s.icon}<span>${s.title}</span></h3>
      <dl class="token-stats">${s.rows
        .map(([label, value]) => `<dt>${label}</dt><dd>${value ?? '—'}</dd>`)
        .join('')}</dl>
    </section>`;
  }

  const sym = (t.symbol || '').toUpperCase();
  const formatUpdateTime = (ts) => {
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

  const overview = {
    icon: tokenSectionIcons.overview,
    title: 'Overview',
    rows: [
      ['Mint', t.mintAddress],
      ['Symbol', sym || '—'],
      ['Decimals', t.decimal ?? t.decimals],
      ['Category', t.category ?? '—'],
      ['Subcategory', t.subcategory ?? '—'],
      ['Verified', t.verified != null ? String(t.verified) : '—'],
    ],
  };
  const priceSection = {
    icon: tokenSectionIcons.price,
    title: 'Price & market cap',
    rows: [
      ['Price (USD)', t.price != null ? `${formatPrice(t.price)} USD` : '—'],
      ['Market cap', t.marketCap != null ? `${formatNum(t.marketCap)} USD` : '—'],
      ['Price (1d ago)', t.price1d != null ? formatPrice(t.price1d) : '—'],
      ['Price (7d ago)', t.price7d != null ? formatPrice(t.price7d) : '—'],
    ],
  };
  const supplyVolumeSection = {
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
  const metaSection = {
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

function renderTradesSummary(opts) {
  const {
    tradesCount,
    uniqueProgramCount,
    programLabels,
    uniquePrograms,
    programTradeCount,
    quoteSymbols,
    top10QuoteMints,
  } = opts;
  const quoteCountWithSymbol = top10QuoteMints.length;
  tradesSummaryMeta.textContent = `From last ${tradesCount} trades: top ${uniqueProgramCount} program(s) by count. Top ${quoteCountWithSymbol} quote tokens by count (with symbol).`;

  const programRows = uniquePrograms
    .map(
      (addr) => {
        const labelCell = hasRealLabel(programLabels, addr) ? programLabels[addr] : '—';
        const count = programTradeCount[addr] ?? 0;
        const link = `<a href="${SOLSCAN_ACCOUNT}${encodeURIComponent(addr)}" target="_blank" rel="noopener noreferrer" class="mono" title="${addr}">${truncateProgramAddress(addr)}</a>`;
        return `<tr><td>${labelCell}</td><td>${link}</td><td>${count}</td></tr>`;
      }
    )
    .join('');
  const quoteRows = top10QuoteMints
    .map(
      ({ mint, count }) => {
        const mintLink = `<a href="${SOLSCAN_TOKEN}${encodeURIComponent(mint)}" target="_blank" rel="noopener noreferrer" class="mono" title="${mint}">${truncateAddress(mint)}</a>`;
        return `<tr><td>${quoteDisplay(mint, quoteSymbols)}</td><td>${mintLink}</td><td>${count}</td></tr>`;
      }
    )
    .join('');

  tradesSummaryContent.innerHTML = `
    <div class="trades-summary-grid">
      <div class="trades-summary-block trades-summary-programs">
        <h3 class="trades-summary-subtitle">Programs (top 10)</h3>
        <div class="table-wrap">
          <table class="trades-summary-table">
            <colgroup><col class="col-label"><col class="col-address"><col class="col-count"></colgroup>
            <thead><tr><th>Label</th><th>Program address</th><th>Count</th></tr></thead>
            <tbody>${programRows}</tbody>
          </table>
        </div>
      </div>
      <div class="trades-summary-block trades-summary-quotes">
        <h3 class="trades-summary-subtitle">Quote tokens (top 10)</h3>
        <div class="table-wrap">
          <table class="trades-summary-table">
            <thead><tr><th>Symbol</th><th>Mint</th><th>Count</th></tr></thead>
            <tbody>${quoteRows}</tbody>
          </table>
        </div>
      </div>
    </div>`;
}

function renderHolders(data) {
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
          const balance = h.balance ?? '—';
          const valueUsd = h.valueUsd != null ? formatNum(Number(h.valueUsd)) : '—';
          const pct = h.percentageOfSupplyHeld != null ? `${Number(h.percentageOfSupplyHeld).toFixed(2)}%` : '—';
          return `<tr>
        <td>${rank}</td>
        <td>${ownerLink}</td>
        <td>${balance}</td>
        <td>${valueUsd}</td>
        <td>${pct}</td>
      </tr>`;
        })
        .join('')
    : '<tr><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>';
}

function renderEmptyState() {
  tokenSymbol.textContent = '—';
  tokenName.textContent = '—';
  tokenLogo.style.display = 'none';
  tokenLogo.src = '';
  tokenLogo.alt = '';

  const dash = (label) => `<dt>${label}</dt><dd>—</dd>`;
  const sectionHtml = (icon, title, rows) =>
    `<section class="token-stats-group">
      <h3 class="token-stats-group-title">${icon}<span>${title}</span></h3>
      <dl class="token-stats">${rows.map(([l]) => dash(l)).join('')}</dl>
    </section>`;

  const overviewRows = [['Mint'], ['Symbol'], ['Decimals'], ['Category'], ['Subcategory'], ['Verified']];
  const priceRows = [['Price (USD)'], ['Market cap'], ['Price (1d ago)'], ['Price (7d ago)']];
  const supplyRows = [['Current supply'], ['Token volume (24h)'], ['USD volume (24h)']];
  const metaRows = [['Update time']];

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
      <div class="trades-summary-block trades-summary-programs">
        <h3 class="trades-summary-subtitle">Programs (top 10)</h3>
        <div class="table-wrap">
          <table class="trades-summary-table">
            <colgroup><col class="col-label"><col class="col-address"><col class="col-count"></colgroup>
            <thead><tr><th>Label</th><th>Program address</th><th>Count</th></tr></thead>
            <tbody><tr><td>—</td><td>—</td><td>—</td></tr></tbody>
          </table>
        </div>
      </div>
      <div class="trades-summary-block trades-summary-quotes">
        <h3 class="trades-summary-subtitle">Quote tokens (top 10)</h3>
        <div class="table-wrap">
          <table class="trades-summary-table">
            <thead><tr><th>Symbol</th><th>Mint</th><th>Count</th></tr></thead>
            <tbody><tr><td>—</td><td>—</td><td>—</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>`;

  holdersMeta.textContent = '—';
  holdersBody.innerHTML = '<tr><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>';
}

renderEmptyState();
