import { NextRequest, NextResponse } from "next/server";

const HF_BASE =
  "https://datasets-server.huggingface.co";
const DATASET = "nvidia/Nemotron-Personas-USA";
const CONFIG = "default";
const SPLIT = "train";

interface NemotronRow {
  row_idx: number;
  row: {
    uuid: string;
    professional_persona: string;
    persona: string;
    sex: string;
    age: number;
    education_level: string;
    occupation: string;
    city: string;
    state: string;
  };
}

interface HFResponse {
  rows: NemotronRow[];
}

export interface NemotronResult {
  index: number;
  uuid: string;
  professionalPersona: string;
  persona: string;
  sex: string;
  age: number;
  educationLevel: string;
  occupation: string;
  city: string;
  state: string;
}

const cache = new Map<string, { data: NemotronResult[]; ts: number }>();
const CACHE_TTL = 15_000;

function mapRow(r: NemotronRow): NemotronResult {
  return {
    index: r.row_idx,
    uuid: r.row.uuid,
    professionalPersona: r.row.professional_persona,
    persona: r.row.persona,
    sex: r.row.sex,
    age: r.row.age,
    educationLevel: r.row.education_level,
    occupation: r.row.occupation,
    city: r.row.city,
    state: r.row.state,
  };
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const q = params.get("q")?.trim();
  const limit = Math.min(parseInt(params.get("limit") ?? "20") || 20, 50);

  // Structured filter params
  const sex = params.get("sex")?.trim();
  const ageMin = params.get("ageMin")?.trim();
  const ageMax = params.get("ageMax")?.trim();
  const educationLevel = params.get("educationLevel")?.trim();
  const occupation = params.get("occupation")?.trim();
  const city = params.get("city")?.trim();
  const state = params.get("state")?.trim();

  const hasFilters = sex || ageMin || ageMax || educationLevel || occupation || city || state;

  if (!q && !hasFilters) {
    return NextResponse.json({ results: [] });
  }

  // Build cache key from all params
  const cacheKey = JSON.stringify({ q, limit, sex, ageMin, ageMax, educationLevel, occupation, city, state });
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({ results: cached.data });
  }

  try {
    let url: string;

    if (q && !hasFilters) {
      // Free-text search only
      url = `${HF_BASE}/search?dataset=${encodeURIComponent(DATASET)}&config=${CONFIG}&split=${SPLIT}&query=${encodeURIComponent(q)}&length=${limit}`;
    } else if (hasFilters && !q) {
      // Structured filter only
      const where = buildWhereClause({ sex, ageMin, ageMax, educationLevel, occupation, city, state });
      url = `${HF_BASE}/filter?dataset=${encodeURIComponent(DATASET)}&config=${CONFIG}&split=${SPLIT}&where=${encodeURIComponent(where)}&length=${limit}`;
    } else {
      // Both: use search with query (filters aren't supported on /search endpoint)
      // Build a combined query string that includes filter terms
      const filterTerms: string[] = [q!];
      if (sex) filterTerms.push(sex);
      if (educationLevel) filterTerms.push(educationLevel.replace(/_/g, " "));
      if (occupation) filterTerms.push(occupation.replace(/_/g, " "));
      if (city) filterTerms.push(city);
      if (state) filterTerms.push(state);
      const combinedQuery = filterTerms.join(" ");
      url = `${HF_BASE}/search?dataset=${encodeURIComponent(DATASET)}&config=${CONFIG}&split=${SPLIT}&query=${encodeURIComponent(combinedQuery)}&length=${limit}`;
    }

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to search Nemotron personas" },
        { status: 502 },
      );
    }

    const data: HFResponse = await res.json();
    const results = data.rows.map(mapRow);

    cache.set(cacheKey, { data: results, ts: Date.now() });

    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Search failed" },
      { status: 502 },
    );
  }
}

function buildWhereClause(filters: {
  sex?: string;
  ageMin?: string;
  ageMax?: string;
  educationLevel?: string;
  occupation?: string;
  city?: string;
  state?: string;
}): string {
  const conditions: string[] = [];

  if (filters.sex) {
    conditions.push(`"sex"='${filters.sex}'`);
  }
  if (filters.ageMin) {
    conditions.push(`"age">=${filters.ageMin}`);
  }
  if (filters.ageMax) {
    conditions.push(`"age"<=${filters.ageMax}`);
  }
  if (filters.educationLevel) {
    conditions.push(`"education_level"='${filters.educationLevel}'`);
  }
  if (filters.occupation) {
    conditions.push(`"occupation"='${filters.occupation}'`);
  }
  if (filters.city) {
    conditions.push(`"city"='${filters.city}'`);
  }
  if (filters.state) {
    conditions.push(`"state"='${filters.state}'`);
  }

  return conditions.join(" AND ");
}
