#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from './api.js';

const apiKey = process.env.VYBE_API_KEY;
if (!apiKey) {
  console.error('Set VYBE_API_KEY in .env (see .env.example)');
  process.exit(1);
}

const DEFAULT_MINT = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'; // BONK

const mint = process.argv[2] || DEFAULT_MINT;
const client = createClient(apiKey);

async function main() {
  console.log('Token mint:', mint);
  console.log('');

  try {
    const token = await client.getToken(mint);
    console.log('--- Token stats & metadata ---');
    console.log('Symbol:', token.symbol);
    console.log('Name:', token.name);
    console.log('Mint:', token.mintAddress);
    console.log('Decimals:', token.decimal);
    console.log('Price (USD):', token.price);
    console.log('Market cap:', token.marketCap);
    console.log('Category:', token.category ?? '—');
    console.log('Logo:', token.logoUrl ?? '—');
    if (token.price1d != null) console.log('Price 1d:', token.price1d);
    if (token.price7d != null) console.log('Price 7d:', token.price7d);
    if (token.currentSupply != null) console.log('Current supply:', token.currentSupply);
    console.log('');

    const holders = await client.getTopHolders(mint, { limit: 10 });
    const list = holders.data || [];
    console.log('--- Top holders (first 10) ---');
    console.log('Total returned:', list.length);
    list.slice(0, 5).forEach((h) => {
      console.log(`  #${h.rank} ${h.ownerAddress} balance=${h.balance} valueUsd=${h.valueUsd} ${h.percentageOfSupplyHeld}%`);
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    process.exit(1);
  }
}

main();
