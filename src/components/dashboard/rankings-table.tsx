"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, EyeOff } from "lucide-react";

interface RankedItem {
  id: string;
  label: string;
  mu: number;
  sigmaSq: number;
  comparisonCount: number;
  content: {
    sourceType?: string;
    studentName?: string;
    studentEmail?: string;
  } | null;
}

interface RankingsTableProps {
  items: RankedItem[];
  hasCanvasItems: boolean;
}

export function RankingsTable({ items, hasCanvasItems }: RankingsTableProps) {
  const [showStudents, setShowStudents] = useState(false);

  return (
    <div className="space-y-3">
      {hasCanvasItems && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStudents(!showStudents)}
          >
            {showStudents ? (
              <>
                <EyeOff className="mr-2 h-4 w-4" />
                Hide Student Names
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Show Student Names
              </>
            )}
          </Button>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Rank</TableHead>
            <TableHead>Label</TableHead>
            {showStudents && <TableHead>Student</TableHead>}
            <TableHead className="text-right">Rating</TableHead>
            <TableHead className="text-right">Uncertainty</TableHead>
            <TableHead className="text-right">Comparisons</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{index + 1}</TableCell>
              <TableCell>{item.label}</TableCell>
              {showStudents && (
                <TableCell>
                  {item.content?.sourceType === "canvas" ? (
                    <div>
                      <p className="text-sm font-medium">{item.content.studentName}</p>
                      <p className="text-xs text-muted-foreground">{item.content.studentEmail}</p>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">&mdash;</span>
                  )}
                </TableCell>
              )}
              <TableCell className="text-right font-mono">
                {Math.round(item.mu)}
              </TableCell>
              <TableCell className="text-right font-mono">
                {Math.round(Math.sqrt(item.sigmaSq))}
              </TableCell>
              <TableCell className="text-right">
                {item.comparisonCount}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
