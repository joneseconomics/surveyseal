"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronRight, AlertTriangle, Clock, ArrowLeftRight } from "lucide-react";

interface ComparisonData {
  id: string;
  leftItemId: string;
  rightItemId: string;
  winnerId: string | null;
  createdAt: string; // ISO string
  judgedAt: string | null; // ISO string
}

interface JudgeData {
  sessionId: string;
  email: string | null;
  status: string;
  verificationStatus: string;
  botScore: number | null;
  startedAt: string;
  completedAt: string | null;
  comparisons: ComparisonData[];
  comparisonsExpected: number;
}

interface ItemMap {
  [id: string]: { label: string; mu: number };
}

interface JudgesTableProps {
  judges: JudgeData[];
  items: ItemMap;
}

function computeJudgeMetrics(judge: JudgeData, items: ItemMap) {
  const judged = judge.comparisons.filter((c) => c.winnerId !== null && c.judgedAt);

  // Time per comparison (ms)
  const durations = judged
    .map((c) => {
      const created = new Date(c.createdAt).getTime();
      const judgedAt = new Date(c.judgedAt!).getTime();
      return judgedAt - created;
    })
    .filter((d) => d > 0 && d < 600_000); // filter out nonsense (>10 min)

  durations.sort((a, b) => a - b);
  const medianDurationMs = durations.length > 0
    ? durations[Math.floor(durations.length / 2)]
    : null;

  const totalTimeMs = judge.completedAt
    ? new Date(judge.completedAt).getTime() - new Date(judge.startedAt).getTime()
    : null;

  // Left/right bias
  const leftPicks = judged.filter((c) => c.winnerId === c.leftItemId).length;
  const leftBias = judged.length > 0 ? leftPicks / judged.length : 0.5;

  // Consensus agreement: did they pick the higher-rated item?
  let agreesWithConsensus = 0;
  let comparableCount = 0;
  for (const c of judged) {
    const left = items[c.leftItemId];
    const right = items[c.rightItemId];
    if (!left || !right || !c.winnerId) continue;
    // Skip if items are essentially tied
    if (Math.abs(left.mu - right.mu) < 10) continue;
    comparableCount++;
    const higherMuId = left.mu > right.mu ? c.leftItemId : c.rightItemId;
    if (c.winnerId === higherMuId) agreesWithConsensus++;
  }
  const consensusRate = comparableCount > 0 ? agreesWithConsensus / comparableCount : null;

  return {
    judgedCount: judged.length,
    medianDurationMs,
    totalTimeMs,
    leftBias,
    consensusRate,
  };
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${minutes}m ${secs}s`;
}

function BiasBar({ value }: { value: number }) {
  // value is 0..1 where 0.5 = perfectly balanced
  const pct = Math.round(value * 100);
  const isSkewed = value < 0.3 || value > 0.7;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isSkewed ? "bg-yellow-500" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-mono ${isSkewed ? "text-yellow-600" : "text-muted-foreground"}`}>
        {pct}% L
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "COMPLETED":
      return <Badge variant="default">Completed</Badge>;
    case "ACTIVE":
      return <Badge variant="secondary">Active</Badge>;
    case "ABANDONED":
      return <Badge variant="outline">Abandoned</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function VerificationBadge({ status }: { status: string }) {
  switch (status) {
    case "VERIFIED":
      return <Badge className="bg-green-100 text-green-800">Verified</Badge>;
    case "PARTIAL":
      return <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>;
    case "UNVERIFIED":
      return <Badge variant="outline">Unverified</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function BotRiskBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-muted-foreground">—</span>;
  if (score < 0.3) return <Badge className="bg-green-100 text-green-800">Low</Badge>;
  if (score < 0.7) return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
  return <Badge className="bg-red-100 text-red-800">High</Badge>;
}

function ConsensusIndicator({ rate }: { rate: number | null }) {
  if (rate === null) return <span className="text-xs text-muted-foreground">—</span>;
  const pct = Math.round(rate * 100);
  const color = rate >= 0.7 ? "text-green-700" : rate >= 0.5 ? "text-yellow-700" : "text-red-700";
  return <span className={`text-sm font-mono ${color}`}>{pct}%</span>;
}

function SpeedFlag({ medianMs }: { medianMs: number | null }) {
  if (medianMs === null) return null;
  if (medianMs < 2000) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-600" title="Very fast — possible inattentive judging">
        <AlertTriangle className="h-3 w-3" />
        Speed
      </span>
    );
  }
  return null;
}

function JudgeDetailRow({ judge, items }: { judge: JudgeData; items: ItemMap }) {
  const metrics = computeJudgeMetrics(judge, items);

  return (
    <TableRow>
      <TableCell colSpan={9} className="bg-muted/30 p-0">
        <div className="p-4 space-y-4">
          {/* Per-comparison detail table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Left Item</TableHead>
                  <TableHead>Right Item</TableHead>
                  <TableHead>Winner</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {judge.comparisons.map((c, i) => {
                  const left = items[c.leftItemId];
                  const right = items[c.rightItemId];
                  const duration = c.judgedAt
                    ? new Date(c.judgedAt).getTime() - new Date(c.createdAt).getTime()
                    : null;
                  const isFast = duration !== null && duration < 2000;
                  return (
                    <TableRow key={c.id} className={c.winnerId === null ? "opacity-50" : ""}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>
                        <span className={c.winnerId === c.leftItemId ? "font-semibold text-primary" : ""}>
                          {left?.label ?? "Unknown"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={c.winnerId === c.rightItemId ? "font-semibold text-primary" : ""}>
                          {right?.label ?? "Unknown"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {c.winnerId
                          ? items[c.winnerId]?.label ?? "Unknown"
                          : <span className="text-muted-foreground">Unjudged</span>
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        {duration !== null ? (
                          <span className={`font-mono text-sm ${isFast ? "text-red-600" : ""}`}>
                            {formatDuration(duration)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

        </div>
      </TableCell>
    </TableRow>
  );
}


export function JudgesTable({ judges, items }: JudgesTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (judges.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No judges have participated yet.
        </CardContent>
      </Card>
    );
  }

  // Pre-compute metrics for sorting
  const judgesWithMetrics = judges.map((j) => ({
    ...j,
    metrics: computeJudgeMetrics(j, items),
  }));

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Judge</TableHead>
            <TableHead className="text-right">Comparisons</TableHead>
            <TableHead className="text-right">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Median Time
              </span>
            </TableHead>
            <TableHead className="text-right">Total Time</TableHead>
            <TableHead>
              <span className="inline-flex items-center gap-1">
                <ArrowLeftRight className="h-3 w-3" />
                L/R Bias
              </span>
            </TableHead>
            <TableHead className="text-right">Consensus</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Flags</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {judgesWithMetrics.map((judge) => {
            const isExpanded = expandedId === judge.sessionId;
            const { metrics } = judge;
            return (
              <>
                <TableRow
                  key={judge.sessionId}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setExpandedId(isExpanded ? null : judge.sessionId)}
                >
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      {isExpanded
                        ? <ChevronDown className="h-4 w-4" />
                        : <ChevronRight className="h-4 w-4" />
                      }
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">
                        {judge.email || "Anonymous"}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {judge.sessionId.slice(0, 8)}…
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {metrics.judgedCount}/{judge.comparisonsExpected}
                  </TableCell>
                  <TableCell className="text-right">
                    {metrics.medianDurationMs !== null
                      ? <span className="font-mono text-sm">{formatDuration(metrics.medianDurationMs)}</span>
                      : <span className="text-muted-foreground">—</span>
                    }
                  </TableCell>
                  <TableCell className="text-right">
                    {metrics.totalTimeMs !== null
                      ? <span className="font-mono text-sm">{formatDuration(metrics.totalTimeMs)}</span>
                      : <span className="text-muted-foreground">—</span>
                    }
                  </TableCell>
                  <TableCell>
                    {metrics.judgedCount > 0
                      ? <BiasBar value={metrics.leftBias} />
                      : <span className="text-muted-foreground">—</span>
                    }
                  </TableCell>
                  <TableCell className="text-right">
                    <ConsensusIndicator rate={metrics.consensusRate} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <StatusBadge status={judge.status} />
                      <VerificationBadge status={judge.verificationStatus} />
                      <BotRiskBadge score={judge.botScore} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <SpeedFlag medianMs={metrics.medianDurationMs} />
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <JudgeDetailRow key={`${judge.sessionId}-detail`} judge={judge} items={items} />
                )}
              </>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
