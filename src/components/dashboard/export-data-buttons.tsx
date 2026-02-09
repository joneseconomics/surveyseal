"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface RankingRow {
  rank: number;
  label: string;
  rating: number;
  uncertainty: number;
  comparisons: number;
  studentName?: string;
  studentEmail?: string;
}

interface JudgeRow {
  email: string;
  sessionId: string;
  comparisonsCompleted: number;
  comparisonsExpected: number;
  medianTimeMs: number | null;
  totalTimeMs: number | null;
  leftBiasPercent: number;
  consensusPercent: number | null;
  status: string;
  verificationStatus: string;
  botScore: number | null;
}

interface ExportDataButtonsProps {
  rankings: RankingRow[];
  judges: JudgeRow[];
  hasCanvasItems: boolean;
}

function escapeCsv(value: string | number | null): string {
  if (value === null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv(filename: string, headers: string[], rows: (string | number | null)[][]) {
  const lines = [
    headers.map(escapeCsv).join(","),
    ...rows.map((r) => r.map(escapeCsv).join(",")),
  ];
  const csvContent = lines.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ExportDataButtons({ rankings, judges, hasCanvasItems }: ExportDataButtonsProps) {
  function exportRankings() {
    const headers = ["Rank", "Label", "Rating", "Uncertainty", "Comparisons"];
    if (hasCanvasItems) {
      headers.push("Student Name", "Student Email");
    }

    const rows = rankings.map((r) => {
      const row: (string | number | null)[] = [
        r.rank,
        r.label,
        r.rating,
        r.uncertainty,
        r.comparisons,
      ];
      if (hasCanvasItems) {
        row.push(r.studentName ?? null, r.studentEmail ?? null);
      }
      return row;
    });

    downloadCsv("rankings.csv", headers, rows);
  }

  function exportJudges() {
    const headers = [
      "Email",
      "Session ID",
      "Comparisons Completed",
      "Comparisons Expected",
      "Median Time (s)",
      "Total Time (s)",
      "Left Bias %",
      "Consensus %",
      "Status",
      "Verification",
      "Bot Score",
    ];

    const rows = judges.map((j) => [
      j.email,
      j.sessionId,
      j.comparisonsCompleted,
      j.comparisonsExpected,
      j.medianTimeMs !== null ? +(j.medianTimeMs / 1000).toFixed(1) : null,
      j.totalTimeMs !== null ? +(j.totalTimeMs / 1000).toFixed(1) : null,
      j.leftBiasPercent,
      j.consensusPercent,
      j.status,
      j.verificationStatus,
      j.botScore,
    ]);

    downloadCsv("judges.csv", headers, rows);
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={exportRankings}>
        <Download className="mr-2 h-4 w-4" />
        Export Rankings
      </Button>
      <Button variant="outline" size="sm" onClick={exportJudges}>
        <Download className="mr-2 h-4 w-4" />
        Export Judges
      </Button>
    </div>
  );
}
