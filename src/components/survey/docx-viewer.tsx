"use client";

import { useEffect, useState } from "react";
import mammoth from "mammoth";
import { Loader2 } from "lucide-react";

interface DocxViewerProps {
  url: string;
}

export function DocxViewer({ url }: DocxViewerProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function convert() {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch document");
        const arrayBuffer = await res.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        if (!cancelled) setHtml(result.value);
      } catch (err) {
        if (!cancelled) setError("Could not load document");
        console.error("DocxViewer error:", err);
      }
    }

    convert();
    return () => { cancelled = true; };
  }, [url]);

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (html === null) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        <span className="text-sm">Loading document...</span>
      </div>
    );
  }

  return (
    <div
      className="prose prose-sm max-w-none overflow-auto rounded-md border bg-white p-4"
      style={{ maxHeight: "500px" }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
