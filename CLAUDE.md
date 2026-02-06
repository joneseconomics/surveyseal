# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SurveySeal is a self-contained survey platform for academic research that uses NFC-based physical verification to prove survey respondents are human. It pairs NXP NTAG 424 DNA smart cards with university SSO to generate cryptographic proof-of-presence at three checkpoints per survey (opening tap, mid-survey attention check, closing tap).

## Technology Stack

- **Framework:** Next.js 15 (App Router, TypeScript)
- **Package Manager:** pnpm
- **Hosting:** Vercel (serverless functions, CDN)
- **Database:** PostgreSQL (local dev via Docker or system install; Vercel Postgres in production)
- **ORM:** Prisma 7 (schema migrations, type-safe queries)
- **Auth:** Auth.js v5 (next-auth@beta) with Google and Microsoft Entra ID providers
- **NFC Verification:** Custom API route using Node.js `crypto` (HMAC-SHA256) to validate NTAG 424 SUN codes
- **Styling:** Tailwind CSS v4 + shadcn/ui

## Architecture

Single Next.js monolith with three user-facing surfaces and one API layer:

- **Researcher Dashboard (`/dashboard`)** — Survey builder, checkpoint placement, real-time response monitoring, CSV export with full verification chain
- **Public Survey (`/s/[surveyId]`)** — Participant-facing, one question at a time, server-gated (next questions not sent until checkpoint validated)
- **Participant Verification (`/verify`)** — Opens on phone after NFC tap; validates SUN code, displays two-word phrase (90s TTL)
- **API Routes (`/api`):**
  - `/api/nfc/validate` — Validates card UID, SUN MAC, rolling counter; returns two-word phrase
  - `/api/survey/checkpoint` — Validates entered phrase, unlocks next survey section
  - `/api/survey/submit` — Stores verified response after all three checkpoints pass

## Database Schema (7 core tables + 3 Auth.js tables)

| Table | Purpose |
|-------|---------|
| `users` | Researchers and participants (role, SSO provider, institution) |
| `cards` | Registered NFC cards (7-byte NTAG 424 UID, AES key, rolling counter) |
| `surveys` | Researcher-created surveys (draft/live/closed status) |
| `questions` | Survey questions with type (multiple_choice, likert, free_text, matrix, ranking) and optional `is_checkpoint` flag |
| `survey_sessions` | Active survey attempts (links participant, card, 32-byte session_secret) |
| `checkpoints` | Verification events (tap counter, phrase hash, expiry) |
| `responses` | Submitted answers (JSON) |
| `accounts` | Auth.js OAuth accounts |
| `auth_sessions` | Auth.js sessions (JWT strategy, so rarely used) |
| `verification_tokens` | Auth.js email verification tokens |

## Three-Tap Verification Protocol

Each checkpoint generates a two-word phrase via:
```
hash = HMAC-SHA256(session_secret, card_uid + timestamp_window + checkpoint_id)
```
First 4 bytes select Word 1 (mod 2,048), next 4 bytes select Word 2 (mod 2,048). Phrases expire after 90 seconds. The card UID, timestamp, and session secret ensure phrases are non-reusable and unpredictable.

## Key Design Constraints

- **Server-side question gating:** Never send questions to the browser beyond the current checkpoint boundary. This is a core security property.
- **Rolling counter validation:** Each NFC tap must increment the NTAG 424 hardware counter. Reject any tap where counter <= last known value.
- **Single codebase:** No microservices. Everything lives in one Next.js project deployed with `vercel --prod`.
- **Researcher-accessible:** Target user is a grad student, not an engineer. The survey builder and dashboard must be simple.
- **NFC card cost target:** $1.50–$3.00 per card (NXP NTAG 424 DNA, PVC CR-80 form factor).
- **JWT session strategy:** Auth.js uses JWT to avoid Prisma in edge middleware.
- **NFC mock mode:** `NFC_MOCK_MODE=true` enables full-stack testing without NFC hardware.

## Commands

```bash
# Development
pnpm dev                          # local dev server (Turbopack)
pnpm build                        # production build
pnpm exec prisma migrate dev      # run database migrations
pnpm exec prisma generate         # regenerate Prisma client after schema changes
pnpm exec prisma studio           # visual database browser
pnpm exec prisma db seed          # seed database with test data
docker compose up -d              # start local Postgres (if using Docker)
vercel --prod                     # deploy to production
```
