/**
 * Vybe trades and related: /v4/trades, /v4/programs/labeled-program-accounts, /v4/wallets/top-traders.
 * @see https://docs.vybenetwork.com/reference/get_trade_data_program_v4
 * @see https://docs.vybenetwork.com/reference/get_top_traders_v4
 */

import type { AxiosInstance } from 'axios';
import type { VybeProgramsResponse, VybeTopTradersResponse } from '../types/api.js';
import { withRetry } from './client.js';

/** Trade item from GET /v4/trades (shape varies; we use programAddress, quoteMintAddress, marketAddress). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type VybeTradesResponse = { data?: any[]; [key: string]: unknown };

export interface GetTradesOptions {
  limit?: number;
  sortByDesc?: string;
}

/**
 * Fetch last N trades for a base token.
 * @param http - Authenticated axios instance
 * @param baseMintAddress - Base token mint
 * @param options - limit (default 100), sortByDesc (default blockTime)
 */
export async function getTrades(
  http: AxiosInstance,
  baseMintAddress: string,
  options: GetTradesOptions = {}
): Promise<VybeTradesResponse> {
  const { limit = 100, sortByDesc = 'blockTime' } = options;
  return withRetry(async () => {
    const { data } = await http.get<VybeTradesResponse>('/v4/trades', {
      params: { baseMintAddress, limit, sortByDesc },
    });
    return data;
  });
}

/**
 * Fetch labeled program for a single program address.
 * GET /v4/programs/labeled-program-accounts?programAddress=xxx — one request per address.
 * @see https://docs.vybenetwork.com/reference/get_known_program_accounts_v4
 */
export async function getLabeledProgramAccount(
  http: AxiosInstance,
  programAddress: string
): Promise<VybeProgramsResponse> {
  try {
    return await withRetry(async () => {
      const { data } = await http.get<VybeProgramsResponse>('/v4/programs/labeled-program-accounts', {
        params: { programAddress: programAddress.trim() },
      });
      return data;
    });
  } catch {
    return { programs: [] };
  }
}

export interface GetTopTradersOptions {
  resolution?: string;
  sortByDesc?: string;
  limit?: number;
}

/**
 * Fetch top traders by realized PnL for a token (e.g. 30d).
 * @param http - Authenticated axios instance
 * @param mintAddress - Token mint
 * @param options - resolution (default 30d), sortByDesc (default realizedPnlUsd), limit (default 100)
 */
export async function getTopTraders(
  http: AxiosInstance,
  mintAddress: string,
  options: GetTopTradersOptions = {}
): Promise<VybeTopTradersResponse> {
  const { resolution = '30d', sortByDesc = 'realizedPnlUsd', limit = 100 } = options;
  return withRetry(async () => {
    const { data } = await http.get<VybeTopTradersResponse>('/v4/wallets/top-traders', {
      params: { mintAddress, resolution, sortByDesc, limit },
    });
    return data;
  });
}
