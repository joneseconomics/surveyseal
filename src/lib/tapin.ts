/**
 * TapIn API client.
 *
 * All TapIn API details are isolated here so the contract can be
 * swapped easily once real documentation is available.
 */

export interface TapInTapRecord {
  id: string;
  email: string;
  tapped_at: string;
  card_id: string;
}

interface TapInResponse {
  taps: TapInTapRecord[];
}

const TAPIN_API_BASE = "https://api.tapin.me/v1";

export async function fetchTapInTaps(
  apiKey: string,
  campaignId: string,
  email: string,
  from: Date,
  to: Date,
): Promise<TapInTapRecord[]> {
  const url = new URL(`${TAPIN_API_BASE}/taps`);
  url.searchParams.set("campaign_id", campaignId);
  url.searchParams.set("email", email);
  url.searchParams.set("from", from.toISOString());
  url.searchParams.set("to", to.toISOString());

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    throw new Error(`TapIn API error: ${res.status} ${res.statusText}`);
  }

  const data: TapInResponse = await res.json();
  return data.taps;
}
