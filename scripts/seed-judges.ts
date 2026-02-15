/**
 * Seed 5 fake hiring-manager judge sessions for a CJ RESUMES survey.
 *
 * Usage:
 *   npx tsx scripts/seed-judges.ts
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { config } from "dotenv";

// Load .env.local
config({ path: ".env.local" });

const SURVEY_ID = "cmliafg2p000004l268gckkp8";

// ── Rating logic (mirrors src/lib/cj/scoring.ts) ───────────────────────────

const INITIAL_SIGMA_SQ = 350_000;
const BASE_K = 32;
const SIGMA_DECAY = 0.85;

interface RatedItem {
  mu: number;
  sigmaSq: number;
}

function updateRatings(winner: RatedItem, loser: RatedItem) {
  const expectedWinner =
    1 / (1 + Math.pow(10, (loser.mu - winner.mu) / 400));
  const expectedLoser = 1 - expectedWinner;
  const kWinner = BASE_K * (1 + winner.sigmaSq / INITIAL_SIGMA_SQ);
  const kLoser = BASE_K * (1 + loser.sigmaSq / INITIAL_SIGMA_SQ);
  return {
    winner: {
      mu: winner.mu + kWinner * (1 - expectedWinner),
      sigmaSq: winner.sigmaSq * SIGMA_DECAY,
    },
    loser: {
      mu: loser.mu - kLoser * expectedLoser,
      sigmaSq: loser.sigmaSq * SIGMA_DECAY,
    },
  };
}

// ── Adaptive pairing (mirrors src/lib/cj/adaptive-pairing.ts) ──────────────

interface PairCandidate {
  id: string;
  mu: number;
  sigmaSq: number;
}

function canonicalKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function selectNextPair(
  items: PairCandidate[],
  comparedKeys: Set<string>
): { left: PairCandidate; right: PairCandidate } | null {
  if (items.length < 2) return null;
  let best: { left: PairCandidate; right: PairCandidate; gain: number } | null =
    null;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const key = canonicalKey(items[i].id, items[j].id);
      if (comparedKeys.has(key)) continue;
      const totalSigma = items[i].sigmaSq + items[j].sigmaSq;
      if (totalSigma === 0) continue;
      const muDiff = items[i].mu - items[j].mu;
      const gain = totalSigma * Math.exp(-(muDiff * muDiff) / (2 * totalSigma));
      if (!best || gain > best.gain) {
        best = { left: items[i], right: items[j], gain };
      }
    }
  }
  return best;
}

// ── Personas ────────────────────────────────────────────────────────────────

const PERSONAS = [
  {
    email: "analyst.senior@example.com",
    demographics: {
      jobTitle: "Senior Financial Analyst",
      employer: "JPMorgan Chase",
      city: "New York",
      state: "NY",
      hasHiringExperience: true,
      hiringRoles: ["directSupervisor", "hiringCommittee"],
    },
  },
  {
    email: "finance.mgr@example.com",
    demographics: {
      jobTitle: "Finance Manager",
      employer: "Deloitte",
      city: "Chicago",
      state: "IL",
      hasHiringExperience: true,
      hiringRoles: ["directSupervisor"],
    },
  },
  {
    email: "vp.finance@example.com",
    demographics: {
      jobTitle: "VP of Finance",
      employer: "Goldman Sachs",
      city: "San Francisco",
      state: "CA",
      hasHiringExperience: true,
      hiringRoles: ["hiringCommittee"],
    },
  },
  {
    email: "inv.analyst@example.com",
    demographics: {
      jobTitle: "Investment Analyst",
      employer: "Fidelity Investments",
      city: "Boston",
      state: "MA",
      hasHiringExperience: false,
      hiringRoles: [],
    },
  },
  {
    email: "dir.corpfin@example.com",
    demographics: {
      jobTitle: "Director of Corporate Finance",
      employer: "Bank of America",
      city: "Charlotte",
      state: "NC",
      hasHiringExperience: true,
      hiringRoles: ["directSupervisor", "hiringCommittee"],
    },
  },
];

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL!, max: 1 });
  const adapter = new PrismaPg(pool);
  const db = new PrismaClient({ adapter });

  // Load survey and its items
  const survey = await db.survey.findUnique({
    where: { id: SURVEY_ID },
    include: {
      cjItems: { orderBy: { position: "asc" } },
      questions: { where: { isVerificationPoint: true } },
    },
  });

  if (!survey) {
    console.error("Survey not found:", SURVEY_ID);
    process.exit(1);
  }

  const totalComparisons =
    survey.comparisonsPerJudge ?? Math.max(survey.cjItems.length - 1, 1);

  console.log(`Survey: ${survey.title}`);
  console.log(`CJ Items: ${survey.cjItems.length}`);
  console.log(`Comparisons per judge: ${totalComparisons}`);
  console.log(`Verification points: ${survey.questions.length}`);
  console.log(`Seeding ${PERSONAS.length} judge sessions...\n`);

  for (let i = 0; i < PERSONAS.length; i++) {
    const persona = PERSONAS[i];
    console.log(
      `── Judge ${i + 1}/${PERSONAS.length}: ${persona.demographics.jobTitle} @ ${persona.demographics.employer} ──`
    );

    // 1. Create session
    const session = await db.surveySession.create({
      data: {
        surveyId: SURVEY_ID,
        participantEmail: persona.email,
        judgeDemographics: persona.demographics,
        verificationStatus: "UNVERIFIED",
        status: "ACTIVE",
      },
    });

    // 2. Create verification points (mark as resolved since we're seeding)
    for (const vpQuestion of survey.questions) {
      await db.verificationPoint.create({
        data: {
          sessionId: session.id,
          questionId: vpQuestion.id,
          verified: true,
          skipped: false,
          validatedAt: new Date(),
        },
      });
    }

    // 3. Build comparisons using adaptive pairing, then judge them
    // Use a local copy of item ratings for this judge's session
    // (each judge sees the global state at the time they start)
    const itemRatings = new Map(
      survey.cjItems.map((item) => [
        item.id,
        { mu: item.mu, sigmaSq: item.sigmaSq },
      ])
    );

    const comparedKeys = new Set<string>();

    for (let pos = 0; pos < totalComparisons; pos++) {
      // Build candidates from current global ratings
      const candidates: PairCandidate[] = survey.cjItems.map((item) => ({
        id: item.id,
        mu: itemRatings.get(item.id)!.mu,
        sigmaSq: itemRatings.get(item.id)!.sigmaSq,
      }));

      const pair = selectNextPair(candidates, comparedKeys);

      if (!pair) {
        console.log(`  No more unique pairs available at position ${pos}`);
        break;
      }

      comparedKeys.add(canonicalKey(pair.left.id, pair.right.id));

      // Randomly assign left/right and pick a winner
      const isLeftWinner = Math.random() < 0.5;
      const leftItem = pair.left;
      const rightItem = pair.right;
      const winnerId = isLeftWinner ? leftItem.id : rightItem.id;
      const loserId = isLeftWinner ? rightItem.id : leftItem.id;

      const winnerRating = itemRatings.get(winnerId)!;
      const loserRating = itemRatings.get(loserId)!;

      // Compute rating update
      const result = updateRatings(
        { mu: winnerRating.mu, sigmaSq: winnerRating.sigmaSq },
        { mu: loserRating.mu, sigmaSq: loserRating.sigmaSq }
      );

      // Create comparison and update items in a transaction
      await db.$transaction([
        db.comparison.create({
          data: {
            sessionId: session.id,
            position: pos,
            leftItemId: leftItem.id,
            rightItemId: rightItem.id,
            winnerId,
            judgedAt: new Date(),
            prevLeftMu: itemRatings.get(leftItem.id)!.mu,
            prevLeftSigmaSq: itemRatings.get(leftItem.id)!.sigmaSq,
            prevRightMu: itemRatings.get(rightItem.id)!.mu,
            prevRightSigmaSq: itemRatings.get(rightItem.id)!.sigmaSq,
          },
        }),
        db.cJItem.update({
          where: { id: winnerId },
          data: {
            mu: result.winner.mu,
            sigmaSq: result.winner.sigmaSq,
            comparisonCount: { increment: 1 },
          },
        }),
        db.cJItem.update({
          where: { id: loserId },
          data: {
            mu: result.loser.mu,
            sigmaSq: result.loser.sigmaSq,
            comparisonCount: { increment: 1 },
          },
        }),
      ]);

      // Update local tracking
      itemRatings.set(winnerId, result.winner);
      itemRatings.set(loserId, result.loser);

      console.log(
        `  Comparison ${pos + 1}/${totalComparisons}: ${isLeftWinner ? "left" : "right"} wins`
      );
    }

    // 4. Mark session completed
    const vpCount = survey.questions.length;
    const verificationStatus =
      vpCount === 0 ? "UNVERIFIED" : ("VERIFIED" as const);

    await db.surveySession.update({
      where: { id: session.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        verificationStatus,
      },
    });

    console.log(`  ✓ Session ${session.id} completed\n`);
  }

  // Print final item ratings
  const finalItems = await db.cJItem.findMany({
    where: { surveyId: SURVEY_ID },
    orderBy: { mu: "desc" },
  });

  console.log("── Final Item Rankings ──");
  for (const item of finalItems) {
    console.log(
      `  ${item.label}: μ=${item.mu.toFixed(1)}, σ²=${item.sigmaSq.toFixed(0)}, comparisons=${item.comparisonCount}`
    );
  }

  await db.$disconnect();
  await pool.end();
  console.log("\n✓ Done! 5 judge sessions seeded.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
