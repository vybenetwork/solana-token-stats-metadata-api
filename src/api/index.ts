/**
 * Vybe API client: single entry that wires tokens, holders, and trades.
 * Usage: createClient(apiKey) then client.getToken(mint), client.getTopHolders(mint), etc.
 */

import type { VybeToken } from '../types/api.js';
import { createHttpClient } from './client.js';
import { getToken as fetchToken } from './tokens.js';
import { getTopHolders, type GetTopHoldersOptions } from './holders.js';
import {
  getTrades,
  getLabeledProgramAccount,
  getTopTraders,
  type GetTradesOptions,
  type GetTopTradersOptions,
  type VybeTradesResponse,
} from './trades.js';
import type { VybeTopHoldersResponse, VybeProgramsResponse, VybeTopTradersResponse } from '../types/api.js';

export interface VybeClient {
  getToken(mintAddress: string): Promise<VybeToken>;
  getTopHolders(mintAddress: string, options?: GetTopHoldersOptions): Promise<VybeTopHoldersResponse>;
  getTrades(baseMintAddress: string, options?: GetTradesOptions): Promise<VybeTradesResponse>;
  getLabeledProgramAccount(programAddress: string): Promise<VybeProgramsResponse>;
  getTopTraders(mintAddress: string, options?: GetTopTradersOptions): Promise<VybeTopTradersResponse>;
}

/**
 * Create a Vybe API client. All methods use the same API key and retry logic.
 * @param apiKey - VYBE_API_KEY (from env or passed in)
 */
export function createClient(apiKey: string): VybeClient {
  const http = createHttpClient(apiKey);
  return {
    getToken: (mintAddress: string) => fetchToken(http, mintAddress),
    getTopHolders: (mintAddress: string, options?: GetTopHoldersOptions) =>
      getTopHolders(http, mintAddress, options),
    getTrades: (baseMintAddress: string, options?: GetTradesOptions) =>
      getTrades(http, baseMintAddress, options),
    getLabeledProgramAccount: (programAddress: string) => getLabeledProgramAccount(http, programAddress),
    getTopTraders: (mintAddress: string, options?: GetTopTradersOptions) =>
      getTopTraders(http, mintAddress, options),
  };
}
