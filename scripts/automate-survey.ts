/**
 * Playwright script to complete a CJ RESUMES survey 5 times
 * as different simulated hiring managers.
 *
 * Usage:
 *   npx tsx scripts/automate-survey.ts
 *
 * Step 1: The script launches Chrome on Windows with remote debugging.
 * Step 2: You sign in with Google manually in the browser.
 * Step 3: The script automates 5 survey completions.
 */

import { chromium, type Page } from "playwright";
import { execSync, spawn } from "child_process";

const SURVEY_URL =
  "https://surveyseal.vercel.app/s/cmliafg2p000004l268gckkp8";
const TOTAL_RUNS = 5;
const CDP_PORT = 9223;

// ── Fake hiring-manager personas ────────────────────────────────────────────

const PERSONAS = [
  {
    jobTitle: "Senior Financial Analyst",
    employer: "JPMorgan Chase",
    city: "New York",
    state: "NY",
    hiringExp: "yes" as const,
    roles: ["directSupervisor", "hiringCommittee"],
  },
  {
    jobTitle: "Finance Manager",
    employer: "Deloitte",
    city: "Chicago",
    state: "IL",
    hiringExp: "yes" as const,
    roles: ["directSupervisor"],
  },
  {
    jobTitle: "VP of Finance",
    employer: "Goldman Sachs",
    city: "San Francisco",
    state: "CA",
    hiringExp: "yes" as const,
    roles: ["hiringCommittee"],
  },
  {
    jobTitle: "Investment Analyst",
    employer: "Fidelity Investments",
    city: "Boston",
    state: "MA",
    hiringExp: "no" as const,
    roles: [],
  },
  {
    jobTitle: "Director of Corporate Finance",
    employer: "Bank of America",
    city: "Charlotte",
    state: "NC",
    hiringExp: "yes" as const,
    roles: ["directSupervisor", "hiringCommittee"],
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function humanDelay(minMs = 400, maxMs = 1200) {
  return sleep(minMs + Math.random() * (maxMs - minMs));
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // Launch Chrome on Windows with remote debugging
  const chromeExe =
    "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe";
  // Windows-style path for Chrome (it's a Windows process)
  const userDataDir = "C:\\Users\\jonm9\\AppData\\Local\\Temp\\pw-survey-chrome";

  console.log("Launching Chrome with remote debugging...");

  const chromeProc = spawn(chromeExe, [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--disable-blink-features=AutomationControlled",
    SURVEY_URL,
  ], {
    stdio: "ignore",
    detached: true,
  });
  chromeProc.unref();

  // Wait for Chrome to start and CDP to be available
  console.log("Waiting for Chrome to start...");
  let connected = false;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
      if (res.ok) {
        connected = true;
        break;
      }
    } catch {
      // not ready yet
    }
    await sleep(1000);
  }

  if (!connected) {
    console.error("Failed to connect to Chrome. Is it running?");
    process.exit(1);
  }

  // Connect Playwright via CDP
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`);
  console.log("✓ Connected to Chrome via CDP");

  // Step 1: Wait for user to sign in
  const contexts = browser.contexts();
  const ctx = contexts[0];
  const pages = ctx.pages();
  let page = pages.find((p) => p.url().includes("surveyseal")) || pages[0];

  if (!page) {
    page = await ctx.newPage();
    await page.goto(SURVEY_URL);
  }

  // Check if already on a page with Begin Survey (already authed)
  const alreadyAuthed = await page
    .locator('button:has-text("Begin Survey")')
    .isVisible({ timeout: 3000 })
    .catch(() => false);

  if (!alreadyAuthed) {
    console.log("═══════════════════════════════════════════");
    console.log("  Please sign in with Google in the browser");
    console.log("  The script will continue automatically");
    console.log("  once it detects 'Begin Survey' button.");
    console.log("═══════════════════════════════════════════");

    await page.waitForSelector('button:has-text("Begin Survey")', {
      timeout: 300_000,
    });
  }

  console.log("✓ Auth detected, starting automation...");

  // Close the initial page — we'll open fresh ones per run
  await page.close();

  // Step 2: Run the survey 5 times
  for (let run = 0; run < TOTAL_RUNS; run++) {
    const persona = PERSONAS[run];
    console.log(
      `\n══════ Run ${run + 1}/${TOTAL_RUNS}: ${persona.jobTitle} @ ${persona.employer} ══════`
    );

    const runPage = await ctx.newPage();

    try {
      await completeSurvey(runPage, persona);
      console.log(`✓ Run ${run + 1} completed successfully`);
    } catch (err) {
      console.error(`✗ Run ${run + 1} failed:`, err);
    }

    await runPage.close();

    if (run < TOTAL_RUNS - 1) {
      console.log("  Waiting 3s before next run...");
      await sleep(3000);
    }
  }

  (browser as unknown as { disconnect(): void }).disconnect();
  console.log("\n✓ All done! You can close Chrome manually.");
}

// ── Survey flow ─────────────────────────────────────────────────────────────

async function completeSurvey(
  page: Page,
  persona: (typeof PERSONAS)[number]
) {
  // 1. Navigate to survey landing
  await page.goto(SURVEY_URL, { waitUntil: "networkidle" });
  await humanDelay(500, 1000);

  const url = page.url();

  // If we're on the landing page, click "Begin Survey"
  if (!url.includes("/instructions") && !url.includes("/compare")) {
    console.log("  → Landing page, clicking Begin...");
    const beginBtn = page.locator('button:has-text("Begin Survey")');
    await beginBtn.waitFor({ timeout: 15_000 });
    await humanDelay();
    await beginBtn.click();
    await page.waitForURL("**/instructions**", { timeout: 15_000 });
  }

  // 2. Instructions page — fill demographics form
  if (page.url().includes("/instructions")) {
    console.log("  → Filling demographics form...");
    await fillDemographics(page, persona);
  }

  // 3. Comparison page — complete all comparisons
  if (page.url().includes("/compare")) {
    await completeComparisons(page);
  }

  // 4. Submit
  console.log("  → Submitting survey...");
  const submitBtn = page.locator('button:has-text("Submit Survey")');
  await submitBtn.waitFor({ timeout: 30_000 });
  await humanDelay(800, 1500);
  await submitBtn.click();

  // 5. Wait for complete page
  await page.waitForURL("**/complete**", { timeout: 15_000 });
  console.log("  → Complete page reached");
}

async function fillDemographics(
  page: Page,
  persona: (typeof PERSONAS)[number]
) {
  await humanDelay(500, 800);

  // Job Title
  await page.fill('input[name="jobTitle"]', persona.jobTitle);
  await humanDelay(200, 500);

  // Employer
  await page.fill('input[name="employer"]', persona.employer);
  await humanDelay(200, 500);

  // City
  await page.fill('input[name="city"]', persona.city);
  await humanDelay(200, 500);

  // State — click the select trigger, then pick the option
  await page.locator('[data-slot="select-trigger"]').click();
  await humanDelay(300, 600);
  await page
    .locator('[data-slot="select-item"]')
    .filter({ hasText: `(${persona.state})` })
    .click();
  await humanDelay(200, 400);

  // Hiring experience radio
  await page
    .locator(`[data-slot="radio-group-item"][value="${persona.hiringExp}"]`)
    .click();
  await humanDelay(300, 600);

  // Hiring roles (checkboxes, only if "yes")
  if (persona.hiringExp === "yes") {
    for (const role of persona.roles) {
      await page
        .locator(`[data-slot="checkbox"][value="${role}"]`)
        .click();
      await humanDelay(200, 400);
    }
  }

  // Submit form (the "Continue to Survey" button)
  await humanDelay(400, 800);
  await page.locator('button[type="submit"]:has-text("Continue")').click();

  // Wait for redirect to compare page
  await page.waitForURL("**/compare**", { timeout: 15_000 });
  console.log("  → Demographics submitted, on compare page");
}

async function completeComparisons(page: Page) {
  let comparisonNum = 0;

  while (true) {
    comparisonNum++;

    // Wait for either Select buttons or Submit button
    await page
      .locator('button:has-text("Select"), button:has-text("Submit Survey")')
      .first()
      .waitFor({ timeout: 30_000 });

    // Check if we see the submit button (means all comparisons done)
    const submitVisible = await page
      .locator('button:has-text("Submit Survey")')
      .isVisible()
      .catch(() => false);

    if (submitVisible) {
      console.log(`  → All ${comparisonNum - 1} comparisons completed`);
      return;
    }

    // Get all "Select" buttons (exclude any that say "Selected")
    const selectButtons = page.locator(
      'button:has-text("Select"):not(:has-text("Selected"))'
    );
    const count = await selectButtons.count();

    if (count < 2) {
      await sleep(2000);
      continue;
    }

    // Pick randomly: left (0) or right (1)
    const choice = Math.random() < 0.5 ? 0 : 1;
    console.log(
      `  → Comparison ${comparisonNum}: picking ${choice === 0 ? "left" : "right"}`
    );

    await humanDelay(1500, 4000); // "reading" the resumes
    await selectButtons.nth(choice).click();

    // Wait for page to refresh with next comparison
    await humanDelay(500, 1000);
    await page
      .waitForLoadState("networkidle", { timeout: 10_000 })
      .catch(() => {});
    await sleep(1500);
  }
}

// ── Run ─────────────────────────────────────────────────────────────────────

main().catch(console.error);
