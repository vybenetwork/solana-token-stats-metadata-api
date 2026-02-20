/**
 * Vybe API HTTP client: axios instance with X-API-Key, retries, and human-readable errors.
 * Used by tokens, holders, and trades modules. Never log the raw API key.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  VYBE_API_BASE,
  VYBE_TIMEOUT_MS,
  VYBE_MAX_RETRIES,
  VYBE_RETRY_DELAY_MS,
} from '../config.js';

/**
 * Turn Axios/API errors into a message suitable for logs or API responses.
 * Example: "API returned 403 Forbidden — verify your API key has access to the /v4/tokens endpoint."
 */
export function toHumanReadableError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const ax = err as AxiosError<{ message?: string; error?: string }>;
    const status = ax.response?.status;
    const endpoint = ax.config?.url ?? 'endpoint';
    const body = ax.response?.data;
    const msg = typeof body === 'object' && body && (body.message ?? body.error);
    if (status === 403) {
      return `API returned 403 Forbidden — verify your API key has access to ${endpoint}. If the key works locally but not on a server, the key may be IP-restricted; contact Vybe support to allow your server IP.`;
    }
    if (status === 404) {
      return `API returned 404 Not Found for ${endpoint}.`;
    }
    if (status && status >= 500) {
      return `API returned ${status} — Vybe server error. Try again later or contact support.`;
    }
    if (msg && typeof msg === 'string') return msg;
    if (status) return `API returned ${status} for ${endpoint}.`;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

function shouldRetry(err: unknown): boolean {
  if (axios.isAxiosError(err)) {
    if (err.response?.status === 403) return true;
    if (err.code === 'ECONNABORTED') return true;
    if (err.message?.toLowerCase().includes('timeout')) return true;
  }
  return false;
}

/**
 * Run an async function with retries on 403/timeout.
 * @param fn - Function that performs one attempt
 * @returns Result of fn
 */
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= VYBE_MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (shouldRetry(err) && attempt < VYBE_MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, VYBE_RETRY_DELAY_MS));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

/**
 * Create an authenticated axios instance for Vybe API.
 * @param apiKey - VYBE_API_KEY (trimmed)
 */
export function createHttpClient(apiKey: string): AxiosInstance {
  const key = apiKey.trim();
  if (!key) {
    throw new Error('VYBE_API_KEY is required (pass to createClient or set in .env).');
  }
  return axios.create({
    baseURL: VYBE_API_BASE,
    timeout: VYBE_TIMEOUT_MS,
    headers: {
      'X-API-Key': key,
      Accept: 'application/json',
    },
  });
}
