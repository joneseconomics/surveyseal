"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface InstructionsFlowProps {
  instructionContent: React.ReactNode;
  demographicsForm: React.ReactNode;
}

export function InstructionsFlow({
  instructionContent,
  demographicsForm,
}: InstructionsFlowProps) {
  const [step, setStep] = useState<"instructions" | "demographics">(
    "instructions",
  );

  if (step === "instructions") {
    return (
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {instructionContent}
          <Button
            size="lg"
            className="w-full"
            onClick={() => setStep("demographics")}
          >
            Next
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">About You</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{demographicsForm}</CardContent>
    </Card>
  );
}
