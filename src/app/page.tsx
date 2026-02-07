import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Shield,
  ArrowRight,
  Smartphone,
  ShieldCheck,
  Lock,
  BarChart3,
  TestTube2,
  GraduationCap,
  CreditCard,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { FaqAccordion } from "@/components/landing/faq-accordion";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* ── 1. Sticky Header ── */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2 font-semibold">
            <Shield className="h-5 w-5 text-primary" />
            SurveySeal
          </div>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <a
              href="#how-it-works"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              How It Works
            </a>
            <a
              href="#features"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </a>
            <a
              href="#faq"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/auth/signin">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/dashboard" className="hidden sm:block">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── 2. Hero ── */}
      <section className="flex flex-col items-center justify-center px-4 py-24 text-center sm:py-32">
        <div className="mx-auto max-w-2xl space-y-6">
          <Badge
            variant="secondary"
            className="gap-1.5 px-3 py-1 text-sm font-normal"
          >
            <Shield className="h-3.5 w-3.5" />
            NFC-Verified Survey Platform
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Prove your survey respondents are real.
          </h1>
          <p className="mx-auto max-w-xl text-lg text-muted-foreground">
            SurveySeal pairs TapIn NFC smart cards with cryptographic
            verification to guarantee every response comes from a physically
            present human — not a bot, not a proxy.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/dashboard">
              <Button size="lg">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="outline" size="lg">
                Learn More
              </Button>
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            Powered by{" "}
            <a
              href="https://tapin.me"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              TapIn Survey Cards
            </a>
          </p>
        </div>
      </section>

      {/* ── 3. How It Works ── */}
      <section id="how-it-works" className="border-t px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              How It Works
            </h2>
            <p className="mt-2 text-muted-foreground">
              Three simple steps to verified survey data.
            </p>
          </div>
          <div className="grid gap-10 sm:grid-cols-3">
            {[
              {
                step: 1,
                icon: CreditCard,
                title: "Distribute TapIn Survey cards",
                description:
                  "Hand out reusable NFC smart cards to your study participants. No app or setup required.",
              },
              {
                step: 2,
                icon: Smartphone,
                title: "Respondents tap at three checkpoints",
                description:
                  "At each checkpoint, participants tap their card on their phone to receive a unique verification phrase.",
              },
              {
                step: 3,
                icon: ShieldCheck,
                title: "Export verified data",
                description:
                  "Download research-ready CSV files with cryptographic proof of physical presence at every checkpoint.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="mb-2 text-sm font-medium text-primary">
                  Step {item.step}
                </div>
                <h3 className="mb-1 font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Features ── */}
      <section id="features" className="border-t bg-muted/40 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Features</h2>
            <p className="mt-2 text-muted-foreground">
              Everything you need to collect trustworthy survey data.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Smartphone,
                title: "Three-Tap Verification",
                description:
                  "Opening, mid-survey, and closing NFC taps create an unbroken chain of physical presence proof.",
              },
              {
                icon: Lock,
                title: "Cryptographic Proof",
                description:
                  "HMAC-SHA256 verification phrases with 90-second TTL ensure responses cannot be shared, replayed, or forged.",
              },
              {
                icon: ShieldCheck,
                title: "Server-Side Gating",
                description:
                  "Questions beyond the current checkpoint are never sent to the browser, preventing data leakage or skip-ahead.",
              },
              {
                icon: BarChart3,
                title: "Research-Ready CSV Export",
                description:
                  "Export responses with full verification chain — card IDs, tap timestamps, and counters — for transparent peer review.",
              },
              {
                icon: TestTube2,
                title: "NFC Mock Mode",
                description:
                  "Test the full verification flow without physical NFC hardware. Perfect for development and pilot testing.",
              },
              {
                icon: GraduationCap,
                title: "University SSO Support",
                description:
                  "Sign in with Google or Microsoft Entra ID. Works seamlessly with university single sign-on systems.",
              },
            ].map((feature) => (
              <Card key={feature.title} className="border-0 shadow-none bg-background">
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. For Researchers ── */}
      <section id="researchers" className="border-t px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Built for researchers,
                <br />
                not engineers.
              </h2>
              <p className="mt-4 text-muted-foreground">
                SurveySeal is designed for grad students and research teams who
                need verified data without a technical learning curve. Create
                surveys, distribute cards, and export results — all from a
                simple dashboard.
              </p>
            </div>
            <Card>
              <CardContent className="space-y-4">
                {[
                  "IRB-ready verification logs for ethics review",
                  "Complete audit trail for every response",
                  "No technical expertise required to set up",
                  "Compatible with university IT and SSO systems",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── 6. TapIn Cards ── */}
      <section className="border-t bg-muted/40 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <Badge
                variant="secondary"
                className="mb-4 gap-1.5 px-3 py-1 text-sm font-normal"
              >
                <CreditCard className="h-3.5 w-3.5" />
                TapIn Survey Cards
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight">
                Durable NFC smart cards with hardware security.
              </h2>
              <p className="mt-4 text-muted-foreground">
                TapIn Survey cards are credit-card-sized NFC smart cards
                designed for academic research. Each card carries a unique
                cryptographic identity that produces verifiable taps —
                impossible to clone, share, or replay.
              </p>
              <a
                href="https://tapin.me"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" className="mt-6">
                  Learn more at tapin.me
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </div>
            <div className="space-y-4">
              {[
                {
                  title: "Reusable across surveys",
                  description:
                    "One card works for every study. No reprogramming needed between surveys.",
                },
                {
                  title: "No app required",
                  description:
                    "Respondents tap the card on any NFC-enabled phone. It opens a web page — that's it.",
                },
                {
                  title: "Every tap is cryptographically unique",
                  description:
                    "A hardware counter and rolling code ensure no two taps produce the same verification.",
                },
              ].map((item) => (
                <Card key={item.title} className="border-0 shadow-none bg-background">
                  <CardHeader>
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. FAQ ── */}
      <section id="faq" className="border-t px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="mt-2 text-muted-foreground">
              Everything you need to know about SurveySeal and TapIn Survey
              cards.
            </p>
          </div>
          <FaqAccordion />
        </div>
      </section>

      {/* ── 8. CTA Banner ── */}
      <section className="border-t px-4 py-20">
        <div className="mx-auto max-w-3xl rounded-2xl bg-primary/5 px-6 py-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Ready to collect verified survey data?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Create your first NFC-verified survey in minutes. No technical
            setup required.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/dashboard">
              <Button size="lg">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/auth/signin">
              <Button variant="outline" size="lg">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 9. Footer ── */}
      <footer className="border-t bg-muted/40 px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <div className="flex items-center gap-2 font-semibold">
                <Shield className="h-5 w-5 text-primary" />
                SurveySeal
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                NFC-verified surveys for academic research.
              </p>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a
                    href="#how-it-works"
                    className="hover:text-foreground"
                  >
                    How It Works
                  </a>
                </li>
                <li>
                  <a href="#features" className="hover:text-foreground">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-foreground">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link
                    href="/auth/signin"
                    className="hover:text-foreground"
                  >
                    Sign In
                  </Link>
                </li>
                <li>
                  <a
                    href="https://tapin.me"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    TapIn Cards
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t pt-8 text-sm text-muted-foreground sm:flex-row">
            <p>&copy; {new Date().getFullYear()} SurveySeal. All rights reserved.</p>
            <p>
              Powered by{" "}
              <a
                href="https://tapin.me"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                TapIn
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
