/**
 * Vybe top holders: GET /v4/tokens/{mintAddress}/top-holders.
 * @see https://docs.vybenetwork.com/reference/get_top_holders_v4
 */

import type { AxiosInstance } from 'axios';
import type { VybeTopHoldersResponse } from '../types/api.js';
import { withRetry } from './client.js';

export interface GetTopHoldersOptions {
  limit?: number;
  page?: number;
  sortByAsc?: string;
  sortByDesc?: string;
}

/**
 * Fetch top holders for a token (e.g. top 100 by % supply; updated every 3 hours).
 * @param http - Authenticated axios instance
 * @param mintAddress - Token mint
 * @param options - limit, page, sortByDesc (e.g. percentageOfSupplyHeld)
 */
export async function getTopHolders(
  http: AxiosInstance,
  mintAddress: string,
  options: GetTopHoldersOptions = {}
): Promise<VybeTopHoldersResponse> {
  const { limit = 100, page = 0, sortByAsc, sortByDesc } = options;
  const params: Record<string, number | string> = { limit, page };
  if (sortByAsc) params.sortByAsc = sortByAsc;
  if (sortByDesc) params.sortByDesc = sortByDesc;
  return withRetry(async () => {
    const { data } = await http.get<VybeTopHoldersResponse>(
      `/v4/tokens/${mintAddress}/top-holders`,
      { params }
    );
    return data;
  });
}
