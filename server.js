import 'dotenv/config';
import express from 'express';
import { spawn } from 'child_process';
import { createClient } from './api.js';
import { getTokenSymbol } from './token-symbol.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const useTunnel =
  process.env.TUNNEL === '1' ||
  process.env.TUNNEL === 'true' ||
  process.argv.includes('--tunnel');
const apiKey = process.env.VYBE_API_KEY;

if (!apiKey) {
  console.error('Set VYBE_API_KEY in .env');
  process.exit(1);
}

const app = express();
const client = createClient(apiKey);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/tokens/:mint', async (req, res) => {
  try {
    const mint = (req.params.mint || '').trim();
    if (!mint) return res.status(400).json({ error: 'Mint address required' });
    const token = await client.getToken(mint);
    res.json(token);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: err.message });
  }
});

app.get('/api/tokens/:mint/top-holders', async (req, res) => {
  try {
    const mint = (req.params.mint || '').trim();
    if (!mint) return res.status(400).json({ error: 'Mint address required' });
    const limit = Math.min(Number(req.query.limit) || 100, 100);
    const page = Math.max(0, Number(req.query.page) || 0);
    const sortByDesc = req.query.sortByDesc || 'percentageOfSupplyHeld';
    const data = await client.getTopHolders(mint, { limit, page, sortByDesc });
    res.json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: err.message });
  }
});

app.get('/api/trades', async (req, res) => {
  try {
    const baseMintAddress = (req.query.baseMintAddress || '').trim();
    if (!baseMintAddress) return res.status(400).json({ error: 'baseMintAddress required' });
    const limit = Math.min(Number(req.query.limit) || 1000, 1000);
    const sortByDesc = req.query.sortByDesc || 'blockTime';
    const data = await client.getTrades(baseMintAddress, { limit, sortByDesc });
    res.json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: err.message });
  }
});

app.get('/api/programs', async (_req, res) => {
  try {
    const data = await client.getPrograms();
    res.json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: err.message });
  }
});

app.get('/api/token-symbol/:mint', async (req, res) => {
  try {
    const mint = (req.params.mint || '').trim();
    if (!mint) return res.status(400).json({ error: 'Mint address required' });
    const symbol = await getTokenSymbol(mint);
    res.json({ symbol });
  } catch (err) {
    res.status(500).json({ error: err.message, symbol: req.params.mint });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('Open in browser to view token stats and top holders.');

  if (useTunnel) {
    const child = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${PORT}`], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const tunnelUrlRe = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;
    const onData = (chunk) => {
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
    child.on('error', (err) => {
      console.error('Tunnel failed (is cloudflared installed?):', err.message);
      console.error('Install: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/');
    });
    child.on('exit', (code) => {
      if (code != null && code !== 0) console.error('cloudflared exited with code', code);
    });
  }
});
