/**
 * Resolve token symbol: hardcoded WSOL/USDC, else Metaplex metadata via public mainnet RPC.
 * Used for quote tokens in trades summary and as fallback when Vybe token details fail.
 */

import { Connection, PublicKey } from '@solana/web3.js';

const RPC_URL = process.env.SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com';
const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

const HARDCODED_SYMBOLS: Record<string, string> = {
  So11111111111111111111111111111111111111112: 'WSOL',
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 'USDC',
};

/**
 * Get symbol for a mint: hardcoded for WSOL/USDC, otherwise fetches Metaplex metadata.
 * @param mintAddress - Token mint address
 * @returns Symbol string, or mint address if not found
 */
export async function getTokenSymbol(mintAddress: string): Promise<string> {
  const mint = (mintAddress ?? '').trim();
  if (!mint) return '';
  if (HARDCODED_SYMBOLS[mint]) return HARDCODED_SYMBOLS[mint]!;

  const connection = new Connection(RPC_URL);
  try {
    const mintPubkey = new PublicKey(mint);
    const [pda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        METADATA_PROGRAM_ID.toBuffer(),
        mintPubkey.toBuffer(),
      ],
      METADATA_PROGRAM_ID
    );
    const accountInfo = await connection.getAccountInfo(pda);
    if (!accountInfo?.data?.length) return mint;

    const data = accountInfo.data;
    if (data.length < 69) return mint;
    const nameLen = data.readUInt32LE(65);
    const symbolOffset = 65 + 4 + nameLen;
    if (data.length < symbolOffset + 4) return mint;
    const symbolLen = data.readUInt32LE(symbolOffset);
    if (symbolLen <= 0 || data.length < symbolOffset + 4 + symbolLen) return mint;
    return data.slice(symbolOffset + 4, symbolOffset + 4 + symbolLen).toString('utf8').trim() || mint;
  } catch {
    return mint;
  }
}
