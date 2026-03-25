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
  Smartphone,
  Lock,
  TestTube2,
  LogIn,
  Users,
  ClipboardList,
  CreditCard,
  CheckCircle,
  ExternalLink,
  AlertTriangle,
  Bot,
  ScanEye,
  MapPin,
  ChartNoAxesCombined,
  MonitorSmartphone,
  XCircle,
  Scale,
  Download,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { FaqAccordion } from "@/components/landing/faq-accordion";
import { SurveySealLogo } from "@/components/logo";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* ── 1. Sticky Header ── */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2 font-semibold">
            <SurveySealLogo className="h-6 w-6" />
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
            <Link
              href="/sample-survey"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Try It
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/auth/signin">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
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
            <SurveySealLogo className="h-3.5 w-3.5" />
            Human-Verified Survey Platform
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Verified Surveys.
          </h1>
          <p className="mx-auto max-w-xl text-lg text-muted-foreground">
            SurveySeal introduces human-factor authentication (HFA) to give
            you trustworthy survey data. Powered by{" "}
            <a
              href="https://tapin.me"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground font-medium underline underline-offset-2 hover:text-primary"
            >
              TapIn
            </a>
            {" "}Identity cards, each survey response is backed by a real,
            physical interaction — proving the respondent is not a bot but
            a human who is physically present.
          </p>
          <a
            href="https://tapin.me"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="lg" variant="outline">
              <CreditCard className="mr-2 h-4 w-4" />
              Learn More About TapIn
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </a>
        </div>
      </section>

      {/* ── 3. The Problem ── */}
      <section id="the-problem" className="border-t bg-muted/40 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <Badge
              variant="secondary"
              className="mb-4 gap-1.5 px-3 py-1 text-sm font-normal"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              The Problem
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight">
              Bots are contaminating survey data at scale.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Fraudulent responses are undermining the foundation of
              survey-based decisions — and the problem is accelerating.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="border-0 shadow-none bg-background">
              <CardHeader>
                <CardTitle className="text-3xl font-bold text-destructive">
                  99.8%
                </CardTitle>
                <CardDescription>
                  of attention checks passed by an AI survey agent in 43,000
                  tests — evading every detection method currently in use.{" "}
                  <a
                    href="https://www.pnas.org/doi/10.1073/pnas.2518075122"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Westwood, 2025
                  </a>
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-0 shadow-none bg-background">
              <CardHeader>
                <CardTitle className="text-3xl font-bold text-destructive">
                  78%
                </CardTitle>
                <CardDescription>
                  of studies compromised — a BMJ review of 23 health studies
                  found 18 contained fraudulent data, with infiltration rates
                  from 3% to 94% of participants.{" "}
                  <a
                    href="https://theweek.com/health/how-medical-imposters-are-ruining-health-studies"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    The Week, 2025
                  </a>
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-0 shadow-none bg-background">
              <CardHeader>
                <CardTitle className="text-3xl font-bold text-destructive">
                  $95B
                </CardTitle>
                <CardDescription>
                  lost by global companies to verification failures — 58.6% of
                  businesses struggle with bot fraud, yet 96% believed they
                  could detect it.{" "}
                  <a
                    href="https://www.pymnts.com/digital-identity/2025/nearly-60percent-of-companies-struggle-with-bot-fraud/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    PYMNTS, 2025
                  </a>
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
          <div className="mt-8 rounded-lg border bg-background p-6">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                &ldquo;We can no longer trust that survey responses are coming
                from real people.&rdquo;
              </span>{" "}
              — Sean Westwood, Dartmouth College. His{" "}
              <a
                href="https://www.pnas.org/doi/10.1073/pnas.2518075122"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                PNAS paper
              </a>{" "}
              describes AI agents that simulate realistic reading speeds,
              natural mouse movements, and deliberate typing errors — making
              them indistinguishable from human respondents. The paper calls
              the threat to online surveys{" "}
              <span className="font-medium text-foreground">
                &ldquo;existential.&rdquo;
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* ── 4. Why Existing Solutions Fail ── */}
      <section className="border-t px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Why existing solutions fail.
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-muted-foreground">
              Every widely used countermeasure is software-only — and modern AI
              bypasses all of them. You need new tools.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Bot,
                title: "CAPTCHAs",
                description:
                  "Solved by AI and click farms. They add friction for real respondents but no longer stop automated agents.",
              },
              {
                icon: ScanEye,
                title: "Attention Checks",
                description:
                  "\"Select strongly agree\" traps are trivial for LLMs to pass. Westwood's agent cleared 99.8% of them.",
              },
              {
                icon: MapPin,
                title: "IP & Geolocation Filtering",
                description:
                  "Defeated by VPNs, residential proxies, and cloud hosting. Geographic checks provide no proof of identity.",
              },
              {
                icon: ChartNoAxesCombined,
                title: "Statistical Post-Hoc Detection",
                description:
                  "Response-time and straightlining analysis catches some bad data after collection — but you've already paid for it.",
              },
              {
                icon: MonitorSmartphone,
                title: "Platform Bot Detection",
                description:
                  "Software-only signals from survey platforms are probabilistic, not provable. No cryptographic audit trail.",
              },
              {
                icon: XCircle,
                title: "The Core Problem",
                description:
                  "All these methods guess whether a respondent is human. None can prove it. SurveySeal takes a fundamentally different approach — physical proof, not statistical inference.",
              },
            ].map((item) => (
              <Card key={item.title} className="border-0 shadow-none">
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                    <item.icon className="h-5 w-5 text-destructive" />
                  </div>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. How It Works ── */}
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
                title: "Distribute TapIn Identity cards",
                description:
                  "Hand out reusable TapIn Identity cards to your audience. No app or setup required.",
              },
              {
                step: 2,
                icon: Smartphone,
                title: "Respondents tap at verification points",
                description:
                  "At each verification point, a countdown timer gives respondents time to tap their TapIn card on their phone. After seeing the green checkmark, they click Continue. No card? They can skip.",
              },
              {
                step: 3,
                icon: Download,
                title: "Export verified data",
                description:
                  "Download CSV files with verified proof of physical presence at every verification point.",
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

      {/* ── 6. Features ── */}
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
                title: "Physical-Tap Verification",
                description:
                  "Verification points create an unbroken chain of physical presence proof using TapIn Identity cards.",
              },
              {
                icon: Lock,
                title: "Server-Side Gating",
                description:
                  "Questions beyond the current verification point are never sent to the browser, preventing data leakage or skip-ahead.",
              },
              {
                icon: ClipboardList,
                title: "18 Question Types",
                description:
                  "Multiple choice, Likert scales, matrix grids, ranking, sliders, free text, and more — everything you need for traditional questionnaires.",
              },
              {
                icon: Scale,
                title: "Comparative Judgment",
                description:
                  "Judges compare items side by side instead of scoring them. Three modes: resume screening, assignment grading, and general comparison — with adaptive Elo ratings.",
              },
              {
                icon: Download,
                title: "Data Export",
                description:
                  "Export survey responses, item rankings, and judge analytics as CSV for analysis, compliance, or further processing.",
              },
              {
                icon: Users,
                title: "Real-Time Monitoring",
                description:
                  "Track survey completion, verification status, and response rates in real time from your dashboard.",
              },
              {
                icon: TestTube2,
                title: "Optional Verification",
                description:
                  "Respondents without a TapIn card can skip verification points. Their responses are tagged as unverified for easy filtering.",
              },
              {
                icon: LogIn,
                title: "Flexible Authentication",
                description:
                  "Require sign-in with Google for identified responses, or toggle it off for fully anonymous surveys. More providers coming soon.",
              },
              {
                icon: Clock,
                title: "Completion Time Estimates",
                description:
                  "The survey builder estimates how long respondents will take based on question types and complexity, so you can design surveys that respect their time.",
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

      {/* ── 7. Use Cases ── */}
      <section id="use-cases" className="border-t px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Built for anyone who needs
                <br />
                trustworthy survey data.
              </h2>
              <p className="mt-4 text-muted-foreground">
                SurveySeal works for any use case where you need to know your
                respondents are real. Create surveys, distribute cards, and
                export results — all from a simple dashboard.
              </p>
            </div>
            <Card>
              <CardContent className="space-y-4">
                {[
                  "Resume screening and hiring decisions",
                  "Assignment grading and student assessment",
                  "Academic and scientific research",
                  "Brand feedback and product research",
                  "Political polling and public opinion",
                  "Customer satisfaction and NPS surveys",
                  "Portfolio and design evaluation",
                  "Event and conference feedback",
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

      {/* ── 8. FAQ ── */}
      <section id="faq" className="border-t px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="mt-2 text-muted-foreground">
              Everything you need to know about SurveySeal and TapIn Identity
              cards.
            </p>
          </div>
          <FaqAccordion />
        </div>
      </section>

      {/* ── 9. Footer ── */}
      <footer className="border-t bg-muted/40 px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <div className="flex items-center gap-2 font-semibold">
                <SurveySealLogo className="h-6 w-6" />
                SurveySeal
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Human-verified surveys you can trust.
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
                    TapIn Identity Cards
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
