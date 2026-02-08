import type { QuestionTelemetry, AutomationCheckResult } from "./bot-detection";

interface BotScoreResult {
  botScore: number;
  botSignals: {
    summary: "Low risk" | "Medium risk" | "High risk" | "Unknown";
    automation: number;
    speed: number;
    mouse: number;
    keystroke: number;
    firstInteraction: number;
    focusBlur: number;
    straightLine: number;
    clicks: number;
  };
}

function clamp(value: number, min: number = 0, max: number = 1): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(value: number, humanThreshold: number, botThreshold: number): number {
  // Returns 0 at humanThreshold, 1 at botThreshold, linearly interpolated
  if (humanThreshold === botThreshold) return value <= humanThreshold ? 0 : 1;
  const t = (value - humanThreshold) / (botThreshold - humanThreshold);
  return clamp(t);
}

function scoreAutomation(automationCheck: AutomationCheckResult | null): number {
  if (!automationCheck) return 0;
  if (automationCheck.webdriverDetected) return 1;
  if (automationCheck.phantomDetected) return 1;
  if (automationCheck.noPlugins && automationCheck.noLanguages) return 0.7;
  if (automationCheck.noPlugins || automationCheck.noLanguages) return 0.3;
  return 0;
}

function scoreSpeed(telemetries: QuestionTelemetry[]): number {
  if (telemetries.length === 0) return 0.5;
  const avgMs =
    telemetries.reduce((sum, t) => sum + t.timeSpentMs, 0) / telemetries.length;
  // >5000ms = human (0), <1000ms = bot (1)
  return 1 - lerp(avgMs, 1000, 5000);
}

function scoreMouse(telemetries: QuestionTelemetry[]): number {
  if (telemetries.length === 0) return 0.5;

  // Check if touch-only device (no mouse moves, but has touch events)
  const totalMouseMoves = telemetries.reduce((s, t) => s + t.mouseMoveCount, 0);
  const totalTouchMoves = telemetries.reduce((s, t) => s + t.touchMoveCount, 0);
  if (totalMouseMoves === 0 && totalTouchMoves > 0) return 0;

  const avgDistance =
    telemetries.reduce((s, t) => s + t.mouseDistancePx, 0) / telemetries.length;
  const avgDirChanges =
    telemetries.reduce((s, t) => s + t.directionChanges, 0) / telemetries.length;

  // Distance: >200px = human (0), 0px = bot (1)
  const distScore = 1 - lerp(avgDistance, 0, 200);
  // Direction changes: >5 = human (0), 0 = bot (1)
  const dirScore = 1 - lerp(avgDirChanges, 0, 5);

  return distScore * 0.6 + dirScore * 0.4;
}

function scoreKeystroke(telemetries: QuestionTelemetry[]): number {
  const withKeys = telemetries.filter(
    (t) => t.avgKeypressIntervalMs !== null && t.keypressStdDev !== null
  );
  if (withKeys.length === 0) return 0; // No typing = not suspicious by itself

  const avgStdDev =
    withKeys.reduce((s, t) => s + (t.keypressStdDev ?? 0), 0) / withKeys.length;
  const avgInterval =
    withKeys.reduce((s, t) => s + (t.avgKeypressIntervalMs ?? 0), 0) /
    withKeys.length;

  // StdDev: >20ms = human (0), <5ms = bot (1)
  const stdDevScore = 1 - lerp(avgStdDev, 5, 20);
  // Interval: >100ms = human, <30ms = bot
  const intervalScore = 1 - lerp(avgInterval, 30, 100);

  return Math.max(stdDevScore, intervalScore);
}

function scoreFirstInteraction(telemetries: QuestionTelemetry[]): number {
  const withInteraction = telemetries.filter(
    (t) => t.firstInteractionMs !== null
  );
  if (withInteraction.length === 0) return 0.5;

  const avgDelay =
    withInteraction.reduce((s, t) => s + (t.firstInteractionMs ?? 0), 0) /
    withInteraction.length;

  // >200ms = human (0), <50ms = bot (1)
  return 1 - lerp(avgDelay, 50, 200);
}

function scoreFocusBlur(telemetries: QuestionTelemetry[]): number {
  if (telemetries.length === 0) return 0;
  const avgBlurs =
    telemetries.reduce((s, t) => s + t.blurCount, 0) / telemetries.length;
  // 0-2 = human (0), >10 = bot (1)
  return lerp(avgBlurs, 2, 10);
}

function scoreStraightLine(telemetries: QuestionTelemetry[]): number {
  const withMouse = telemetries.filter((t) => t.mouseMoveCount > 0);
  if (withMouse.length === 0) return 0;

  const avgRatio =
    withMouse.reduce((s, t) => s + t.straightLineRatio, 0) / withMouse.length;
  // <0.5 = human (0), >0.95 = bot (1)
  return lerp(avgRatio, 0.5, 0.95);
}

function scoreClicks(telemetries: QuestionTelemetry[]): number {
  if (telemetries.length === 0) return 0.5;
  const avgClicks =
    telemetries.reduce((s, t) => s + t.clickCount, 0) / telemetries.length;
  // 1-5 = human (0), 0 = bot (1)
  if (avgClicks === 0) return 1;
  if (avgClicks >= 1 && avgClicks <= 5) return 0;
  return 0;
}

const WEIGHTS = {
  automation: 0.35,
  speed: 0.2,
  mouse: 0.15,
  keystroke: 0.1,
  firstInteraction: 0.05,
  focusBlur: 0.05,
  straightLine: 0.05,
  clicks: 0.05,
};

export function computeBotScore(
  telemetries: QuestionTelemetry[],
  automationCheck: AutomationCheckResult | null
): BotScoreResult {
  if (telemetries.length === 0 && !automationCheck) {
    return {
      botScore: 0.5,
      botSignals: {
        summary: "Unknown",
        automation: 0,
        speed: 0.5,
        mouse: 0.5,
        keystroke: 0,
        firstInteraction: 0.5,
        focusBlur: 0,
        straightLine: 0,
        clicks: 0.5,
      },
    };
  }

  const subscores = {
    automation: scoreAutomation(automationCheck),
    speed: scoreSpeed(telemetries),
    mouse: scoreMouse(telemetries),
    keystroke: scoreKeystroke(telemetries),
    firstInteraction: scoreFirstInteraction(telemetries),
    focusBlur: scoreFocusBlur(telemetries),
    straightLine: scoreStraightLine(telemetries),
    clicks: scoreClicks(telemetries),
  };

  const botScore =
    subscores.automation * WEIGHTS.automation +
    subscores.speed * WEIGHTS.speed +
    subscores.mouse * WEIGHTS.mouse +
    subscores.keystroke * WEIGHTS.keystroke +
    subscores.firstInteraction * WEIGHTS.firstInteraction +
    subscores.focusBlur * WEIGHTS.focusBlur +
    subscores.straightLine * WEIGHTS.straightLine +
    subscores.clicks * WEIGHTS.clicks;

  const rounded = Math.round(botScore * 100) / 100;

  let summary: "Low risk" | "Medium risk" | "High risk";
  if (rounded < 0.3) summary = "Low risk";
  else if (rounded < 0.6) summary = "Medium risk";
  else summary = "High risk";

  return {
    botScore: rounded,
    botSignals: { summary, ...subscores },
  };
}
