# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SurveySeal is a survey platform for academic research that supports two survey types: traditional questionnaires and comparative judgment (CJ) studies. It features TapIn-based physical verification (email matching via NFC card taps), bot detection scoring, Canvas LMS integration for importing student submissions, and AI agent-driven synthetic response generation.

## Technology Stack

- **Framework:** Next.js 15 (App Router, TypeScript)
- **Package Manager:** pnpm
- **Hosting:** Vercel (serverless functions, CDN)
- **Database:** Supabase PostgreSQL (remote); local dev via Docker or system install
- **ORM:** Prisma 7 (schema migrations, type-safe queries)
- **Auth:** Auth.js v5 (next-auth@beta) with Google, Microsoft Entra ID, LinkedIn, Apple, and GitHub providers
- **File Storage:** Supabase Storage (bucket: `cj-files` for CJ item uploads and job descriptions)
- **Verification:** TapIn email-matching (NFC card tap → email match → verification point verified)
- **Styling:** Tailwind CSS v4 + shadcn/ui

## Architecture

Single Next.js monolith with two user-facing surfaces and one API layer:

- **Researcher Dashboard (`/dashboard`)** — Survey builder, verification point placement, CJ item management, Canvas import, response monitoring, CSV export, AI agent panel, collaborator sharing
- **Public Survey (`/s/[surveyId]`)** — Participant-facing; questionnaires show one question at a time with server-gated verification points; CJ surveys show side-by-side comparisons with adaptive pairing
- **API Routes (`/api`):**
  - `/api/survey/verification-point` — Handles verification point skip/next actions
  - `/api/survey/response` — Saves individual survey responses
  - `/api/survey/submit` — Submits completed survey session
  - `/api/survey/comparison` — Records CJ comparison judgments and updates Elo ratings
  - `/api/survey/[surveyId]/export` — CSV export (questionnaire responses, CJ rankings, or CJ comparisons)
  - `/api/canvas/*` — Canvas LMS integration (courses, assignments, submissions, import)

## Database Schema (14 models + 3 Auth.js tables)

| Table | Purpose |
|-------|---------|
| `users` | Researchers and participants (role: RESEARCHER/PARTICIPANT/ADMIN, institution) |
| `surveys` | Survey definitions (QUESTIONNAIRE or COMPARATIVE_JUDGMENT, draft/live/closed, TapIn config, Canvas config, AI config) |
| `questions` | Survey questions (18 question types) with optional `is_checkpoint` flag for verification points |
| `survey_sessions` | Survey attempts (participant email, verification status, bot score, AI generation metadata) |
| `verification_points` | Verification checkpoints (verified, skipped, verifiedEmail fields) |
| `responses` | Submitted answers (JSON) with optional telemetry |
| `tapin_taps` | TapIn card tap records (email + timestamp for verification reconciliation) |
| `cj_items` | Comparative Judgment items (label, content, Elo rating: mu/sigmaSq) |
| `comparisons` | CJ pairwise comparisons (left/right items, winner, rating snapshots for re-judgment) |
| `survey_collaborators` | Survey sharing (VIEWER/EDITOR roles, email-based invitations) |
| `ai_agent_runs` | AI persona generation runs (provider, model, persona, session counts, status) |
| `accounts` | Auth.js OAuth accounts |
| `auth_sessions` | Auth.js sessions (JWT strategy, so rarely used) |
| `verification_tokens` | Auth.js email verification tokens |

## Verification System (TapIn Email Matching)

Verification uses TapIn NFC cards with email matching — no cryptographic phrases or session secrets:

1. Researcher configures TapIn API key and campaign ID in survey settings
2. Participant taps a TapIn card, which records their email on the TapIn platform
3. SurveySeal reconciles taps by matching participant emails within the survey session time window
4. Verification points can be skipped by respondents without a TapIn card
5. Sessions are marked VERIFIED, PARTIAL, or UNVERIFIED based on verification point completion

## Question Types (18 supported)

`MULTIPLE_CHOICE`, `CHECKBOX`, `LIKERT`, `RATING`, `NPS`, `CUSTOMER_SATISFACTION`, `SLIDER`, `NUMBER`, `PERCENTAGE`, `MATRIX`, `RANKING`, `FREE_TEXT`, `SHORT_TEXT`, `YES_NO`, `DATE`, `DATE_TIME`, `EMAIL`, `URL`, `PHONE_NUMBER`

## Comparative Judgment (CJ)

- Pairwise comparison with Elo-based rating (dynamic K-factor, uncertainty decay)
- Adaptive pairing selects the most informative pair for each judge
- Subtypes: GENERIC, ASSIGNMENTS, RESUMES
- Canvas LMS integration imports student submissions as CJ items
- Split-half reliability metrics across 20 random splits
- Re-judgment support with rating snapshot reversal

## AI Agent Feature

Generates synthetic survey responses using AI personas:

- **5 LLM providers:** OpenAI, Anthropic, Google Gemini, Groq, DeepSeek (raw `fetch()`, no SDK deps)
- **10 preset personas** with narrative system prompts (PersonaHub-inspired)
- **Client-driven loop:** Each question/comparison is a separate server action call (avoids Vercel 60s timeout)
- Per-question prompt templates for all 18 question types with JSON output validation and retry
- CJ comparison prompting with text-based item content
- AI sessions marked with `isAiGenerated=true`, `botScore=1.0`, purple badge in responses table
- CSV export includes `is_ai_generated`, `ai_persona`, `ai_provider`, `ai_model` columns

## Key Design Constraints

- **Server-side question gating:** Never send questions to the browser beyond the current verification point boundary.
- **Single codebase:** No microservices. Everything lives in one Next.js project deployed with `vercel --prod`.
- **Researcher-accessible:** Target user is a grad student, not an engineer. The survey builder and dashboard must be simple.
- **JWT session strategy:** Auth.js uses JWT to avoid Prisma in edge middleware.
- **Prisma client import path:** `@/generated/prisma/client` (NOT `@/generated/prisma`)

## Commands

```bash
# Development
pnpm dev                          # local dev server (Turbopack)
pnpm build                        # production build
pnpm exec prisma generate         # regenerate Prisma client after schema changes
pnpm exec prisma studio           # visual database browser
pnpm exec prisma db seed          # seed database with test data
docker compose up -d              # start local Postgres (if using Docker)
vercel --prod                     # deploy to production

# Migrations (manual workflow for remote Supabase DB)
# 1. Generate SQL: prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
# 2. Create migration dir: mkdir -p prisma/migrations/<name>/
# 3. Save SQL to: prisma/migrations/<name>/migration.sql
# 4. Apply: prisma migrate deploy

# Testing
npx tsx scripts/test-ai-agent.ts  # run AI agent offline test suite
```
