import { db } from "@/lib/db";
import { randomBytes } from "crypto";
import type { NfcValidationResult } from "./nfc";

// In-memory counter for mock mode (per UID)
const mockCounters = new Map<string, number>();

/**
 * Mock NFC validation for development.
 * Accepts any UID, auto-increments counter, creates cards on the fly.
 * Only active when NFC_MOCK_MODE=true.
 */
export async function validateNfcMock(
  uid: string,
  ownerId: string
): Promise<NfcValidationResult> {
  const normalizedUid = uid.toUpperCase().padStart(14, "0");

  // Auto-increment mock counter
  const currentCounter = mockCounters.get(normalizedUid) ?? 0;
  const newCounter = currentCounter + 1;
  mockCounters.set(normalizedUid, newCounter);

  // Ensure card exists in DB (create on the fly for mock mode)
  const existing = await db.card.findUnique({ where: { uid: normalizedUid } });
  if (!existing) {
    await db.card.create({
      data: {
        uid: normalizedUid,
        aesKey: randomBytes(16).toString("hex"),
        label: `Mock Card (${normalizedUid.slice(-4)})`,
        ownerId,
        rollingCounter: newCounter,
      },
    });
  } else {
    await db.card.update({
      where: { uid: normalizedUid },
      data: { rollingCounter: newCounter },
    });
  }

  return { uid: normalizedUid, counter: newCounter };
}
