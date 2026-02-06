import { Button } from "@/components/ui/button";
import { Shield, ArrowRight, CheckCircle, Smartphone, BarChart3 } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2 font-semibold">
            <Shield className="h-5 w-5 text-primary" />
            SurveySeal
          </div>
          <Link href="/auth/signin">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
            <Shield className="h-3.5 w-3.5" />
            NFC-Verified Survey Platform
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Prove your respondents are real
          </h1>
          <p className="text-lg text-muted-foreground">
            SurveySeal uses NFC smart cards and cryptographic verification to guarantee that every
            survey response comes from a physically present human — not a bot, not a proxy.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/dashboard">
              <Button size="lg">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/40 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">Three-Tap Verification</h3>
              <p className="text-sm text-muted-foreground">
                Opening, mid-survey, and closing NFC taps create an unbroken chain of physical
                presence proof.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">Cryptographic Proof</h3>
              <p className="text-sm text-muted-foreground">
                HMAC-SHA256 phrases with 90-second TTL ensure responses cannot be shared, replayed,
                or forged.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">Research-Ready Export</h3>
              <p className="text-sm text-muted-foreground">
                CSV export with full verification chain — card UID, tap timestamps, counters — for
                transparent peer review.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <div className="mx-auto max-w-5xl px-4">
          SurveySeal — Verified surveys for academic research
        </div>
      </footer>
    </div>
  );
}
