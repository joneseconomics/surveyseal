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
  ArrowRight,
  Smartphone,
  ShieldCheck,
  BarChart3,
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
  GraduationCap,
  FileText,
  TrendingUp,
  Navigation,
  Copy,
  Download,
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
              href="#survey-types"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Survey Types
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
            <SurveySealLogo className="h-3.5 w-3.5" />
            Human-Verified Survey Platform
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Verified Surveys.
          </h1>
          <p className="mx-auto max-w-xl text-lg text-muted-foreground">
            SurveySeal introduces physical-tap verification to give you
            trustworthy survey data.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/dashboard">
              <Button size="lg">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/sample-survey">
              <Button variant="outline" size="lg">
                <ClipboardList className="mr-2 h-4 w-4" />
                Try a Sample Survey
              </Button>
            </Link>
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
                  $0.05
                </CardTitle>
                <CardDescription>
                  per fake response vs. $1.50 for a real human — making
                  large-scale survey manipulation trivially cheap.{" "}
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
                  10–52
                </CardTitle>
                <CardDescription>
                  fake responses would have been enough to flip the outcome of
                  seven major 2024 election polls.{" "}
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
          </div>
          <div className="mt-8 rounded-lg border bg-background p-6">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                &ldquo;We can no longer trust that survey responses are coming
                from real people.&rdquo;
              </span>{" "}
              — Sean Westwood, Dartmouth College. His PNAS paper describes AI
              agents that simulate realistic reading speeds, natural mouse
              movements, and deliberate typing errors — making them
              indistinguishable from human respondents. The paper calls the
              threat to online surveys{" "}
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
                title: "Distribute TapIn Survey cards",
                description:
                  "Hand out reusable TapIn Survey cards to your audience. No app or setup required.",
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
                icon: ShieldCheck,
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

      {/* ── 6. Survey Types ── */}
      <section id="survey-types" className="border-t bg-muted/40 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Two survey types. One platform.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Whether you need traditional questionnaires or pairwise rankings,
              SurveySeal has you covered — with physical-tap verification built
              into both.
            </p>
          </div>

          {/* Questionnaires */}
          <div className="mb-16">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Questionnaires</h3>
                <p className="text-sm text-muted-foreground">
                  Traditional surveys with a rich set of question types.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Multiple Choice",
                  description:
                    "Single-select or multi-select options. Ideal for demographics, preferences, and categorical data.",
                },
                {
                  title: "Likert Scale",
                  description:
                    "Customizable agreement scales (e.g. Strongly Disagree to Strongly Agree) for measuring attitudes and opinions.",
                },
                {
                  title: "Free Text",
                  description:
                    "Open-ended long-form responses for qualitative feedback, comments, and detailed explanations.",
                },
                {
                  title: "Short Text",
                  description:
                    "Single-line text input for names, emails, brief answers, and other short responses.",
                },
                {
                  title: "Matrix",
                  description:
                    "Grid-style questions with multiple rows rated on the same scale — efficient for evaluating several items at once.",
                },
                {
                  title: "Ranking",
                  description:
                    "Drag-and-drop ordering of items by preference. Respondents rank options from most to least preferred.",
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

          {/* Comparative Judgment */}
          <div>
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Scale className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Comparative Judgment</h3>
                <p className="text-sm text-muted-foreground">
                  Rank items through pairwise comparisons with adaptive Elo ratings.
                </p>
              </div>
            </div>
            <p className="mb-6 text-sm text-muted-foreground max-w-3xl">
              Instead of rubrics or scores, judges see two items side by side and
              pick the better one. SurveySeal uses an adaptive algorithm to select
              the most informative pair for each comparison, producing reliable,
              defensible rankings with fewer total judgments.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: FileText,
                  title: "Resume Screening",
                  description:
                    "Upload r\u00e9sum\u00e9s and a job description (URL, PDF, or Word file). Judges act as hiring managers and pick the stronger candidate.",
                },
                {
                  icon: GraduationCap,
                  title: "Assignment Grading",
                  description:
                    "Import student submissions directly from Canvas LMS. Compare work side by side to produce fair, consistent rankings.",
                },
                {
                  icon: Scale,
                  title: "General Comparison",
                  description:
                    "Rank any collection of items — essays, designs, proposals, portfolios. Upload content or paste text.",
                },
                {
                  icon: TrendingUp,
                  title: "Adaptive Pairing",
                  description:
                    "The algorithm picks the most informative pair each time — items with similar ratings or high uncertainty — so every judgment counts.",
                },
                {
                  icon: BarChart3,
                  title: "Judge Analytics",
                  description:
                    "Track reliability, left/right bias, consensus agreement, speed flags, and bot risk for every judge.",
                },
                {
                  icon: Navigation,
                  title: "Revisit & Revise",
                  description:
                    "Judges can navigate back to any earlier comparison and change their pick. Ratings update automatically.",
                },
              ].map((item) => (
                <Card key={item.title} className="border-0 shadow-none bg-background">
                  <CardHeader>
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. Features ── */}
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
                  "Verification points create an unbroken chain of physical presence proof using TapIn Survey cards.",
              },
              {
                icon: ShieldCheck,
                title: "Server-Side Gating",
                description:
                  "Questions beyond the current verification point are never sent to the browser, preventing data leakage or skip-ahead.",
              },
              {
                icon: Scale,
                title: "Comparative Judgment",
                description:
                  "Rank resumes, assignments, or any items via pairwise comparisons with adaptive Elo ratings and reliability scores.",
              },
              {
                icon: GraduationCap,
                title: "Canvas LMS Integration",
                description:
                  "Import student submissions directly from Canvas courses. Submissions become items ready for side-by-side comparison.",
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
                  "Require sign-in with Google or Microsoft for identified responses, or toggle it off for fully anonymous surveys.",
              },
              {
                icon: Copy,
                title: "Survey Duplication",
                description:
                  "Copy any existing survey — including all questions, items, and settings — to create a new version in one click.",
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

      {/* ── 8. TapIn Cards ── */}
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
                Durable smart cards with hardware security.
              </h2>
              <p className="mt-4 text-muted-foreground">
                TapIn Survey cards are credit-card-sized smart cards designed
                for verified surveys. Each card carries a unique identity that
                produces verifiable taps — impossible to clone, share, or
                replay.
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
                    "One card works for every survey. No reprogramming needed between projects.",
                },
                {
                  title: "No app required",
                  description:
                    "Respondents tap the card on their phone. It opens a web page — that's it.",
                },
                {
                  title: "Email-matched verification",
                  description:
                    "Each tap is linked to the respondent's email, ensuring the person who tapped is the person taking the survey.",
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

      {/* ── 9. FAQ ── */}
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

      {/* ── 10. CTA Banner ── */}
      <section className="border-t px-4 py-20">
        <div className="mx-auto max-w-3xl rounded-2xl bg-primary/5 px-6 py-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Ready to collect verified survey data?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Create your first human-verified survey in minutes. No technical
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

      {/* ── 11. Footer ── */}
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
