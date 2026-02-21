/**
 * Entry point: Express server that proxies Vybe API and serves the web GUI.
 * Demonstrates token details, top holders, trades, programs, top traders, and token symbol (Metaplex fallback).
 */

import express, { Request, Response } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnv, getApiKey, PUBLIC_DIR } from './config.js';
import { createClient } from './api/index.js';
import { getTokenSymbol } from './api/token-symbol.js';
import { toHumanReadableError } from './api/client.js';
import {
  readSymbolCacheFromDisk,
  writeSymbolCacheToDisk,
  readProgramCacheFromDisk,
  writeProgramCacheToDisk,
} from './cache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

loadEnv();
const apiKey = getApiKey();
console.log('VYBE_API_KEY loaded (length %d)', apiKey.length);

const useTunnel =
  process.env.TUNNEL === '1' ||
  process.env.TUNNEL === 'true' ||
  process.argv.includes('--tunnel');

const app = express();
const client = createClient(apiKey);

app.use(express.json());
app.use(express.static(PUBLIC_DIR));

function param(req: Request, key: string): string {
  const v = req.params[key] ?? req.query[key];
  return (Array.isArray(v) ? v[0] : v) ?? '';
}

app.get('/api/tokens/:mint', async (req: Request, res: Response) => {
  try {
    const mint = param(req, 'mint').trim();
    if (!mint) return res.status(400).json({ error: 'Mint address required' });
    const token = await client.getToken(mint);
    res.json(token);
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status ?? 500;
    const message = toHumanReadableError(err);
    res.status(status).json({ error: message });
  }
});

app.get('/api/tokens/:mint/top-holders', async (req: Request, res: Response) => {
  try {
    const mint = param(req, 'mint').trim();
    if (!mint) return res.status(400).json({ error: 'Mint address required' });
    const limit = Math.min(Number(req.query.limit) || 100, 100);
    const page = Math.max(0, Number(req.query.page) || 0);
    const sortByDesc = (req.query.sortByDesc as string) || 'percentageOfSupplyHeld';
    const data = await client.getTopHolders(mint, { limit, page, sortByDesc });
    res.json(data);
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status ?? 500;
    res.status(status).json({ error: toHumanReadableError(err) });
  }
});

app.get('/api/trades', async (req: Request, res: Response) => {
  try {
    const mintAddress = param(req, 'mintAddress').trim();
    if (!mintAddress) return res.status(400).json({ error: 'mintAddress required' });
    const limit = Math.min(Number(req.query.limit) || 250, 1000);
    const page = Number(req.query.page) || 0;
    const sortByDesc = (req.query.sortByDesc as string) || 'blockTime';
    const data = await client.getTrades(mintAddress, { limit, page, sortByDesc });
    res.json(data);
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status ?? 500;
    res.status(status).json({ error: toHumanReadableError(err) });
  }
});

const PROGRAM_LABEL_CONCURRENCY = 3;

function labelFromProgramResponse(data: { programs?: Array<{ name?: string; label?: string; symbol?: string; labels?: string[] }> }): string | null {
  const list = data?.programs ?? [];
  const p = list[0];
  if (!p) return null;
  return p.name ?? p.label ?? p.symbol ?? (Array.isArray(p.labels) ? p.labels[0] ?? null : null) ?? null;
}

app.get('/api/programs/labeled-program-account', async (req: Request, res: Response) => {
  try {
    const programAddress = param(req, 'programAddress').trim();
    if (!programAddress) return res.status(400).json({ error: 'programAddress query required' });
    const cache = readProgramCacheFromDisk();
    if (cache[programAddress] != null) return res.json(cache[programAddress]!);
    const data = await client.getLabeledProgramAccount(programAddress);
    const label = labelFromProgramResponse(data);
    if (label != null && label.trim() !== '') {
      cache[programAddress] = data;
      writeProgramCacheToDisk(cache);
    }
    res.json(data);
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status ?? 500;
    res.status(status).json({ error: toHumanReadableError(err) });
  }
});

app.post('/api/programs/labeled-program-accounts', async (req: Request, res: Response) => {
  try {
    const programAddresses = Array.isArray(req.body?.programAddresses)
      ? (req.body.programAddresses as string[]).map((a: unknown) => String(a).trim()).filter(Boolean)
      : [];
    const labels: Record<string, string> = {};
    const cache = readProgramCacheFromDisk();
    const needFetch = programAddresses.filter((addr) => {
      const cached = cache[addr];
      const label = cached != null ? labelFromProgramResponse(cached) : null;
      if (label != null) {
        labels[addr] = label;
        return false;
      }
      return true;
    });
    let updated = false;
    for (let i = 0; i < needFetch.length; i += PROGRAM_LABEL_CONCURRENCY) {
      const batch = needFetch.slice(i, i + PROGRAM_LABEL_CONCURRENCY);
      const results = await Promise.all(
        batch.map(async (addr) => {
          try {
            const data = await client.getLabeledProgramAccount(addr);
            const label = labelFromProgramResponse(data);
            if (label != null && label.trim() !== '') {
              cache[addr] = data;
              updated = true;
            }
            return { addr, label: label ?? null };
          } catch {
            return { addr, label: null };
          }
        })
      );
      for (const { addr, label } of results) {
        if (label != null) labels[addr] = label;
      }
    }
    if (updated) writeProgramCacheToDisk(cache);
    res.json({ labels });
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status ?? 500;
    res.status(status).json({ error: toHumanReadableError(err) });
  }
});

app.get('/api/wallets/top-traders', async (req: Request, res: Response) => {
  try {
    const mintAddress = param(req, 'mintAddress').trim();
    if (!mintAddress) return res.status(400).json({ error: 'mintAddress required' });
    const resolution = (req.query.resolution as string) || '30d';
    const sortByDesc = (req.query.sortByDesc as string) || 'realizedPnlUsd';
    const limit = Math.min(Number(req.query.limit) || 100, 100);
    const data = await client.getTopTraders(mintAddress, { resolution, sortByDesc, limit });
    res.json(data);
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status ?? 500;
    res.status(status).json({ error: toHumanReadableError(err) });
  }
});

app.get('/api/token-symbol/:mint', async (req: Request, res: Response) => {
  try {
    const mint = param(req, 'mint').trim();
    if (!mint) return res.status(400).json({ error: 'Mint address required' });
    const cache = readSymbolCacheFromDisk();
    if (cache[mint] != null) {
      const cached = (cache[mint] ?? '').replace(/\0/g, '').trim();
      return res.json({ symbol: cached });
    }
    let symbol = await getTokenSymbol(mint);
    if (symbol === mint || symbol.trim() === '') {
      try {
        const token = await client.getToken(mint);
        symbol = (token.symbol ?? '').trim() || mint;
      } catch {
        symbol = mint;
      }
    }
    if (symbol.trim() !== '' && symbol !== mint) {
      cache[mint] = symbol;
      writeSymbolCacheToDisk(cache);
    }
    res.json({ symbol });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message, symbol: req.params.mint });
  }
});

app.post('/api/token-symbols', async (req: Request, res: Response) => {
  try {
    const mints = Array.isArray(req.body?.mints)
      ? (req.body.mints as unknown[]).map((m) => String(m).trim()).filter(Boolean)
      : [];
    const symbols: Record<string, string> = {};
    const cache = readSymbolCacheFromDisk();
    const needFetch = mints.filter((mint) => {
      if (cache[mint] != null) {
        symbols[mint] = (cache[mint] ?? '').replace(/\0/g, '').trim();
        return false;
      }
      return true;
    });
    if (needFetch.length > 0) {
      let cacheUpdated = false;
      const results = await Promise.all(
        needFetch.map(async (mint) => {
          try {
            let symbol = await getTokenSymbol(mint);
            if (symbol === mint || symbol.trim() === '') {
              try {
                const token = await client.getToken(mint);
                symbol = (token.symbol ?? '').trim() || mint;
              } catch {
                symbol = mint;
              }
            }
            const trimmed = symbol.replace(/\0/g, '').trim();
            if (trimmed !== '' && trimmed !== mint) {
              cache[mint] = trimmed;
              cacheUpdated = true;
            }
            return { mint, symbol: trimmed || mint };
          } catch {
            return { mint, symbol: mint };
          }
        })
      );
      for (const { mint, symbol } of results) {
        symbols[mint] = symbol;
      }
      if (cacheUpdated) writeSymbolCacheToDisk(cache);
    }
    res.json({ symbols });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('Open in browser to view token stats and top holders.');

  if (useTunnel) {
    const child = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${PORT}`], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const tunnelUrlRe = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;
    const onData = (chunk: Buffer | string) => {
      const text = chunk.toString();
      const match = text.match(tunnelUrlRe);
      if (match) {
        console.log('\n  Cloudflare Tunnel URL: ' + match[0]);
        console.log('  Share this URL to access the app from the internet.\n');
        child.stderr?.off?.('data', onData);
        child.stdout?.off?.('data', onData);
      }
    };
    child.stderr?.on('data', onData);
    child.stdout?.on('data', onData);
    child.on('error', (err: Error) => {
      console.error('Tunnel failed (is cloudflared installed?):', err.message);
      console.error('Install: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/');
    });
    child.on('exit', (code: number | null) => {
      if (code != null && code !== 0) console.error('cloudflared exited with code', code);
    });
  }
});
