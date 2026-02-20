/**
 * Persistent JSON cache for symbol and program-label lookups.
 * Read from disk before each request; write to disk when a new record is added.
 * No startup load — next request sees updates made while the server is running.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { VybeProgramsResponse } from './types/api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const SYMBOL_CACHE_PATH = path.join(DATA_DIR, 'symbol-cache.json');
const PROGRAM_CACHE_PATH = path.join(DATA_DIR, 'program-label-cache.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJsonFile<T>(filePath: string, defaultVal: T): T {
  if (!fs.existsSync(filePath)) return defaultVal;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as T;
    return parsed != null && typeof parsed === 'object' ? parsed : defaultVal;
  } catch {
    return defaultVal;
  }
}

function writeJsonFile(filePath: string, data: object): void {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 0), 'utf8');
}

export function readSymbolCacheFromDisk(): Record<string, string> {
  return readJsonFile<Record<string, string>>(SYMBOL_CACHE_PATH, {});
}

export function writeSymbolCacheToDisk(data: Record<string, string>): void {
  writeJsonFile(SYMBOL_CACHE_PATH, data);
}

export function readProgramCacheFromDisk(): Record<string, VybeProgramsResponse> {
  return readJsonFile<Record<string, VybeProgramsResponse>>(PROGRAM_CACHE_PATH, {});
}

export function writeProgramCacheToDisk(data: Record<string, VybeProgramsResponse>): void {
  writeJsonFile(PROGRAM_CACHE_PATH, data);
}
