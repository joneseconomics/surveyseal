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

// Education levels ordered from lowest to highest (actual dataset values)
const EDUCATION_ORDER = [
  "less_than_9th",
  "9th_12th_no_diploma",
  "high_school",
  "some_college",
  "associates",
  "bachelors",
  "graduate",
];

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
  const minEducation = params.get("minEducation")?.trim();
  const city = params.get("city")?.trim();
  // state can be comma-separated for multi-select
  const stateParam = params.get("state")?.trim();
  const states = stateParam ? stateParam.split(",").map((s) => s.trim()).filter(Boolean) : [];

  const hasFilters = sex || ageMin || ageMax || minEducation || city || states.length > 0;

  if (!q && !hasFilters) {
    return NextResponse.json({ results: [] });
  }

  // Build cache key from all params
  const cacheKey = JSON.stringify({ q, limit, sex, ageMin, ageMax, minEducation, city, states });
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({ results: cached.data });
  }

  try {
    let url: string;

    if (q && !hasFilters) {
      // Free-text search only — use /search endpoint
      url = `${HF_BASE}/search?dataset=${encodeURIComponent(DATASET)}&config=${CONFIG}&split=${SPLIT}&query=${encodeURIComponent(q)}&length=${limit}`;
    } else {
      // Filters present (with or without q) — always use /filter endpoint
      // This ensures structured filters are enforced, not just appended to a text query
      const where = buildWhereClause({ q, sex, ageMin, ageMax, minEducation, city, states });
      url = `${HF_BASE}/filter?dataset=${encodeURIComponent(DATASET)}&config=${CONFIG}&split=${SPLIT}&where=${encodeURIComponent(where)}&length=${limit}`;
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
  q?: string;
  sex?: string;
  ageMin?: string;
  ageMax?: string;
  minEducation?: string;
  city?: string;
  states?: string[];
}): string {
  const conditions: string[] = [];

  // Free-text query: LIKE on professional_persona
  if (filters.q) {
    const escaped = filters.q.replace(/'/g, "''");
    conditions.push(`"professional_persona" LIKE '%${escaped}%'`);
  }

  if (filters.sex) {
    conditions.push(`"sex"='${filters.sex}'`);
  }
  if (filters.ageMin) {
    conditions.push(`"age">=${filters.ageMin}`);
  }
  if (filters.ageMax) {
    conditions.push(`"age"<=${filters.ageMax}`);
  }

  // Minimum education: include all levels at or above the minimum
  if (filters.minEducation) {
    const minIdx = EDUCATION_ORDER.indexOf(filters.minEducation);
    if (minIdx >= 0) {
      const qualifying = EDUCATION_ORDER.slice(minIdx);
      const inList = qualifying.map((e) => `'${e}'`).join(",");
      conditions.push(`"education_level" IN (${inList})`);
    }
  }

  if (filters.city) {
    const escaped = filters.city.replace(/'/g, "''");
    conditions.push(`"city" LIKE '%${escaped}%'`);
  }

  // Multi-state: IN clause
  if (filters.states && filters.states.length > 0) {
    const inList = filters.states.map((s) => `'${s}'`).join(",");
    conditions.push(`"state" IN (${inList})`);
  }

  return conditions.join(" AND ");
}
