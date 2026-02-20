/**
 * Display helpers: truncate addresses, format numbers. Used by server or CLI output.
 * Frontend has its own formatters in public/app.js.
 */

/**
 * Truncate address to first 4 and last 4 chars with ....
 * @param addr - Full address string
 * @param maxLength - If addr is shorter, return as-is
 */
export function truncateAddress(addr: string, maxLength = 12): string {
  if (!addr || addr.length <= maxLength) return addr;
  return addr.slice(0, 4) + '....' + addr.slice(-4);
}
