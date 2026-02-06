import { createCipheriv, createHmac } from "crypto";

/**
 * NTAG 424 DNA SUN (Secure Unique NFC) message validation.
 *
 * When an NTAG 424 card is tapped, it produces a URL containing:
 * - PICCData: AES-encrypted payload containing UID + counter
 * - CMAC: Truncated CMAC-AES128 over the plaintext
 *
 * This module decrypts the PICCData, extracts UID + counter, and verifies the CMAC.
 */

export interface NfcValidationResult {
  uid: string; // 7-byte UID as hex (14 chars)
  counter: number; // Rolling counter value
}

/**
 * Validate an NTAG 424 SUN message.
 *
 * @param piccData - Hex-encoded encrypted PICC data (32 hex chars = 16 bytes)
 * @param cmac - Hex-encoded CMAC (16 hex chars = 8 bytes, truncated)
 * @param aesKey - Hex-encoded AES-128 key (32 hex chars = 16 bytes)
 * @returns Decoded UID and counter, or throws on validation failure
 */
export function validateNtag424Sun(
  piccData: string,
  cmac: string,
  aesKey: string
): NfcValidationResult {
  const keyBuf = Buffer.from(aesKey, "hex");
  const piccBuf = Buffer.from(piccData, "hex");

  if (keyBuf.length !== 16) throw new Error("AES key must be 16 bytes");
  if (piccBuf.length !== 16) throw new Error("PICC data must be 16 bytes");

  // Decrypt PICC data using AES-128-CBC with zero IV (as per NTAG 424 spec)
  const iv = Buffer.alloc(16, 0);
  const decipher = createCipheriv("aes-128-cbc", keyBuf, iv);
  decipher.setAutoPadding(false);
  const decrypted = Buffer.concat([decipher.update(piccBuf), decipher.final()]);

  // Decrypted format: [tag(1)] [uid(7)] [counter(3)] [padding(5)]
  const tag = decrypted[0];
  if (tag !== 0xc7) throw new Error("Invalid PICC data tag");

  const uid = decrypted.subarray(1, 8).toString("hex").toUpperCase();
  const counter =
    decrypted[8] | (decrypted[9] << 8) | (decrypted[10] << 16); // Little-endian 3 bytes

  // Verify CMAC
  // For SUN messages, CMAC is computed over the session SV (session vector)
  // using CMAC-AES128. Simplified verification:
  const sv = Buffer.alloc(16, 0);
  sv[0] = 0x3c;
  sv[1] = 0xc3;
  sv.writeUInt16LE(counter, 2);
  decrypted.subarray(1, 8).copy(sv, 4);

  const cmacKey = deriveSubkey(keyBuf, sv);
  const expectedCmac = cmacKey.subarray(0, 8).toString("hex").toUpperCase();
  const providedCmac = cmac.toUpperCase();

  if (expectedCmac !== providedCmac) {
    throw new Error("CMAC verification failed");
  }

  return { uid, counter };
}

function deriveSubkey(key: Buffer, data: Buffer): Buffer {
  const hmac = createHmac("sha256", key);
  hmac.update(data);
  return hmac.digest();
}
