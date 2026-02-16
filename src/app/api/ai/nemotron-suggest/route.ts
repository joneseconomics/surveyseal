import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { callLLM } from "@/lib/ai/llm-client";

const HF_BASE = "https://datasets-server.huggingface.co";
const DATASET = "nvidia/Nemotron-Personas-USA";
const CONFIG = "default";
const SPLIT = "train";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { url, surveyId } = body as { url?: string; surveyId?: string };

  if (!url || !surveyId) {
    return NextResponse.json({ error: "url and surveyId are required" }, { status: 400 });
  }

  // Look up researcher's API key and survey's AI config
  const [user, survey] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: { aiApiKey: true },
    }),
    db.survey.findUnique({
      where: { id: surveyId },
      select: { aiProvider: true, aiModel: true },
    }),
  ]);

  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }
  if (!user?.aiApiKey) {
    return NextResponse.json({ error: "AI API key not configured" }, { status: 400 });
  }
  if (!survey.aiProvider || !survey.aiModel) {
    return NextResponse.json({ error: "AI provider/model not configured on survey" }, { status: 400 });
  }

  // Fetch the URL content
  let pageText: string;
  try {
    const pageRes = await fetch(url, {
      headers: { "User-Agent": "SurveySeal/1.0" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!pageRes.ok) {
      return NextResponse.json({ error: `Failed to fetch URL (${pageRes.status})` }, { status: 502 });
    }
    const html = await pageRes.text();
    // Strip HTML tags to get plain text
    pageText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 8000); // Limit to ~8k chars for LLM context
  } catch {
    return NextResponse.json({ error: "Failed to fetch URL content" }, { status: 502 });
  }

  // Call LLM to analyze the page and suggest Nemotron search filters
  try {
    const llmResponse = await callLLM(
      survey.aiProvider,
      survey.aiModel,
      user.aiApiKey,
      [
        {
          role: "system",
          content: `You analyze webpage content and suggest search parameters for finding relevant synthetic personas from the NVIDIA Nemotron-Personas-USA dataset.

The dataset contains 1M US-based synthetic personas with these fields:
- professional_persona: A narrative description of the person's professional background
- persona: A shorter persona description
- sex: "Male" or "Female"
- age: integer (18-90)
- education_level: one of "Less than High School", "High School Diploma", "Some College", "Associate Degree", "Bachelor's Degree", "Master's Degree", "Doctorate or Professional Degree"
- occupation: underscore-separated job title (e.g. "software_developer", "registered_nurse")
- city: US city name
- state: 2-letter US state code (e.g. "OH", "CA")

Based on the webpage content, output a JSON object with recommended search parameters. Include a "searchQuery" field with a free-text search string (2-5 words describing the ideal persona), and optionally include any of these filter fields if they are clearly relevant:
- sex: "Male" or "Female"
- ageMin: minimum age (integer)
- ageMax: maximum age (integer)
- educationLevel: one of the education levels listed above
- occupation: underscore-separated occupation
- state: 2-letter state code
- city: city name

Also include a "reasoning" field explaining why you chose these parameters.

Output ONLY valid JSON, no markdown fences.`,
        },
        {
          role: "user",
          content: `Analyze this webpage content and suggest Nemotron persona search parameters:\n\n${pageText}`,
        },
      ],
    );

    // Parse LLM response
    let suggestion: {
      searchQuery?: string;
      sex?: string;
      ageMin?: number;
      ageMax?: number;
      educationLevel?: string;
      occupation?: string;
      state?: string;
      city?: string;
      reasoning?: string;
    };

    try {
      // Strip markdown fences if present
      const cleaned = llmResponse.content
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      suggestion = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse LLM suggestion", raw: llmResponse.content },
        { status: 500 },
      );
    }

    // Use the LLM's suggested filters to query Nemotron
    const searchQuery = suggestion.searchQuery || "";
    const searchUrl = `${HF_BASE}/search?dataset=${encodeURIComponent(DATASET)}&config=${CONFIG}&split=${SPLIT}&query=${encodeURIComponent(searchQuery)}&length=10`;

    const nemRes = await fetch(searchUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });

    if (!nemRes.ok) {
      return NextResponse.json(
        { error: "Failed to search Nemotron with suggestions", reasoning: suggestion.reasoning },
        { status: 502 },
      );
    }

    const nemData = await nemRes.json();
    const results = (nemData.rows ?? []).map((r: { row_idx: number; row: Record<string, unknown> }) => ({
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
    }));

    return NextResponse.json({
      results,
      suggestion: {
        searchQuery: suggestion.searchQuery,
        sex: suggestion.sex,
        ageMin: suggestion.ageMin,
        ageMax: suggestion.ageMax,
        educationLevel: suggestion.educationLevel,
        occupation: suggestion.occupation,
        state: suggestion.state,
        city: suggestion.city,
      },
      reasoning: suggestion.reasoning,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "LLM call failed" },
      { status: 500 },
    );
  }
}
