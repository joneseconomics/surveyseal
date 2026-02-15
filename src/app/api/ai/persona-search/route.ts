import { NextRequest, NextResponse } from "next/server";

const HF_SEARCH_URL =
  "https://datasets-server.huggingface.co/search?dataset=proj-persona/PersonaHub&config=persona&split=train";

interface HFRow {
  row_idx: number;
  row: { persona: string };
}

interface HFSearchResponse {
  rows: HFRow[];
}

const cache = new Map<string, { data: { index: number; persona: string }[]; ts: number }>();
const CACHE_TTL = 15_000;

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") ?? "20") || 20, 50);

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const cacheKey = `${q}:${limit}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({ results: cached.data });
  }

  const url = `${HF_SEARCH_URL}&query=${encodeURIComponent(q)}&length=${limit}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to search PersonaHub" },
      { status: 502 },
    );
  }

  const data: HFSearchResponse = await res.json();

  const results = data.rows.map((r) => ({
    index: r.row_idx,
    persona: r.row.persona,
  }));

  cache.set(cacheKey, { data: results, ts: Date.now() });

  return NextResponse.json({ results });
}
