"use client";

import { useRef, useEffect, useCallback } from "react";

export interface QuestionTelemetry {
  timeSpentMs: number;
  firstInteractionMs: number | null;
  mouseDistancePx: number;
  mouseMoveCount: number;
  directionChanges: number;
  straightLineRatio: number;
  keyCount: number;
  avgKeypressIntervalMs: number | null;
  keypressStdDev: number | null;
  scrollCount: number;
  blurCount: number;
  clickCount: number;
  touchMoveCount: number;
  submittedAt: string;
}

interface TelemetryState {
  mountTime: number;
  firstInteractionTime: number | null;
  lastMouseX: number;
  lastMouseY: number;
  lastMouseTime: number;
  mouseDistance: number;
  mouseMoveCount: number;
  lastDx: number;
  lastDy: number;
  directionChanges: number;
  totalSegments: number;
  straightSegments: number;
  keypressTimes: number[];
  scrollCount: number;
  blurCount: number;
  clickCount: number;
  touchMoveCount: number;
}

function createInitialState(): TelemetryState {
  return {
    mountTime: Date.now(),
    firstInteractionTime: null,
    lastMouseX: -1,
    lastMouseY: -1,
    lastMouseTime: 0,
    mouseDistance: 0,
    mouseMoveCount: 0,
    lastDx: 0,
    lastDy: 0,
    directionChanges: 0,
    totalSegments: 0,
    straightSegments: 0,
    keypressTimes: [],
    scrollCount: 0,
    blurCount: 0,
    clickCount: 0,
    touchMoveCount: 0,
  };
}

function markInteraction(state: TelemetryState) {
  if (state.firstInteractionTime === null) {
    state.firstInteractionTime = Date.now();
  }
}

export function useBotTelemetry(questionId: string) {
  const stateRef = useRef<TelemetryState>(createInitialState());

  useEffect(() => {
    // Reset state when question changes
    stateRef.current = createInitialState();

    const state = stateRef.current;

    const onMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      // Throttle to 50ms
      if (now - state.lastMouseTime < 50) return;

      markInteraction(state);

      if (state.lastMouseX >= 0) {
        const dx = e.clientX - state.lastMouseX;
        const dy = e.clientY - state.lastMouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        state.mouseDistance += dist;
        state.mouseMoveCount++;
        state.totalSegments++;

        // Check for direction change
        if (state.lastDx !== 0 || state.lastDy !== 0) {
          const dotProduct = dx * state.lastDx + dy * state.lastDy;
          if (dotProduct < 0) {
            state.directionChanges++;
          }
          // Straight line: movement in roughly the same direction
          const magPrev = Math.sqrt(state.lastDx ** 2 + state.lastDy ** 2);
          const magCurr = Math.sqrt(dx ** 2 + dy ** 2);
          if (magPrev > 0 && magCurr > 0) {
            const cosAngle = dotProduct / (magPrev * magCurr);
            if (cosAngle > 0.95) {
              state.straightSegments++;
            }
          }
        }

        state.lastDx = dx;
        state.lastDy = dy;
      }

      state.lastMouseX = e.clientX;
      state.lastMouseY = e.clientY;
      state.lastMouseTime = now;
    };

    const onTouchMove = () => {
      markInteraction(state);
      state.touchMoveCount++;
    };

    const onKeyDown = () => {
      markInteraction(state);
      state.keypressTimes.push(Date.now());
    };

    const onScroll = () => {
      state.scrollCount++;
    };

    const onBlur = () => {
      state.blurCount++;
    };

    const onClick = () => {
      markInteraction(state);
      state.clickCount++;
    };

    document.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("keydown", onKeyDown, { passive: true });
    document.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("blur", onBlur, { passive: true });
    document.addEventListener("click", onClick, { passive: true });

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("scroll", onScroll);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("click", onClick);
    };
  }, [questionId]);

  const getTelemetry = useCallback((): QuestionTelemetry => {
    const state = stateRef.current;
    const now = Date.now();

    // Compute keystroke stats
    let avgKeypressIntervalMs: number | null = null;
    let keypressStdDev: number | null = null;

    if (state.keypressTimes.length > 1) {
      const intervals: number[] = [];
      for (let i = 1; i < state.keypressTimes.length; i++) {
        intervals.push(state.keypressTimes[i] - state.keypressTimes[i - 1]);
      }
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      avgKeypressIntervalMs = Math.round(avg);

      if (intervals.length > 1) {
        const variance =
          intervals.reduce((sum, v) => sum + (v - avg) ** 2, 0) /
          (intervals.length - 1);
        keypressStdDev = Math.round(Math.sqrt(variance));
      }
    }

    return {
      timeSpentMs: now - state.mountTime,
      firstInteractionMs:
        state.firstInteractionTime !== null
          ? state.firstInteractionTime - state.mountTime
          : null,
      mouseDistancePx: Math.round(state.mouseDistance),
      mouseMoveCount: state.mouseMoveCount,
      directionChanges: state.directionChanges,
      straightLineRatio:
        state.totalSegments > 0
          ? Math.round((state.straightSegments / state.totalSegments) * 100) /
            100
          : 0,
      keyCount: state.keypressTimes.length,
      avgKeypressIntervalMs,
      keypressStdDev,
      scrollCount: state.scrollCount,
      blurCount: state.blurCount,
      clickCount: state.clickCount,
      touchMoveCount: state.touchMoveCount,
      submittedAt: new Date(now).toISOString(),
    };
  }, []);

  return { getTelemetry };
}

export interface AutomationCheckResult {
  webdriverDetected: boolean;
  phantomDetected: boolean;
  noPlugins: boolean;
  noLanguages: boolean;
  suspicious: boolean;
}

export function detectAutomation(): AutomationCheckResult {
  const nav = typeof navigator !== "undefined" ? navigator : null;
  const win = typeof window !== "undefined" ? (window as unknown as Record<string, unknown>) : null;

  const webdriverDetected = nav?.webdriver === true;
  const phantomDetected = !!(
    win?.phantom ||
    win?.__nightmare ||
    win?.callPhantom ||
    win?._selenium_unwrapped ||
    win?.__webdriver_evaluate ||
    win?.__driver_evaluate
  );
  const noPlugins = nav ? nav.plugins.length === 0 : false;
  const noLanguages = nav ? nav.languages.length === 0 : false;

  const suspicious = webdriverDetected || phantomDetected || (noPlugins && noLanguages);

  return {
    webdriverDetected,
    phantomDetected,
    noPlugins,
    noLanguages,
    suspicious,
  };
}
