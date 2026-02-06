import { createHmac, createHash, timingSafeEqual } from "crypto";
import { WORDLIST } from "@/lib/wordlist";

const PHRASE_TTL_MS = 90_000; // 90 seconds
const TIMESTAMP_WINDOW_MS = 30_000; // 30-second windows

/**
 * Generate a two-word phrase from session secret + card UID + checkpoint ID.
 * Uses HMAC-SHA256 with 30-second timestamp windows to produce a deterministic
 * but time-limited phrase.
 */
export function generatePhrase(
  sessionSecret: string,
  cardUid: string,
  checkpointId: string
): { word1: string; word2: string; expiresAt: Date } {
  const timestampWindow = Math.floor(Date.now() / TIMESTAMP_WINDOW_MS).toString();
  const data = `${cardUid}:${timestampWindow}:${checkpointId}`;

  const hmac = createHmac("sha256", Buffer.from(sessionSecret, "hex"));
  hmac.update(data);
  const hash = hmac.digest();

  // First 4 bytes → Word 1 (mod 2048), next 4 bytes → Word 2 (mod 2048)
  const index1 = hash.readUInt32BE(0) % WORDLIST.length;
  const index2 = hash.readUInt32BE(4) % WORDLIST.length;

  const word1 = WORDLIST[index1];
  const word2 = WORDLIST[index2];

  const expiresAt = new Date(Date.now() + PHRASE_TTL_MS);

  return { word1, word2, expiresAt };
}

/**
 * Hash a phrase for storage. We store the hash, not the plaintext.
 */
export function hashPhrase(word1: string, word2: string): string {
  const phrase = `${word1.toLowerCase()} ${word2.toLowerCase()}`;
  return createHash("sha256").update(phrase).digest("hex");
}

/**
 * Verify a phrase against a stored hash using timing-safe comparison.
 */
export function verifyPhrase(
  word1: string,
  word2: string,
  storedHash: string
): boolean {
  const candidateHash = hashPhrase(word1, word2);
  try {
    return timingSafeEqual(
      Buffer.from(candidateHash, "hex"),
      Buffer.from(storedHash, "hex")
    );
  } catch {
    return false;
  }
}
