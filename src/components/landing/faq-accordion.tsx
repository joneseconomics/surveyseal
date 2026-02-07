"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What is SurveySeal?",
    answer:
      "SurveySeal is a survey platform that uses physical-tap verification to prove respondents are real, physically present humans — not bots, proxies, or duplicate entries. It works for any use case: brand feedback, political polling, customer satisfaction, academic research, and more.",
  },
  {
    question: "How does physical-tap verification work?",
    answer:
      "Each survey includes three checkpoints: opening, mid-survey, and closing. At each checkpoint, a countdown timer gives the respondent time to tap their TapIn Survey card on their phone. After tapping, the TapIn platform shows a green checkmark, and the respondent clicks Continue. After the survey, you can reconcile TapIn tap logs with SurveySeal sessions by email and timestamp. Respondents without a card can skip checkpoints — their responses are tagged as unverified.",
  },
  {
    question: "What are TapIn Survey cards?",
    answer:
      "TapIn Survey cards are durable, credit-card-sized smart cards with built-in hardware security. Each card has a unique identity and produces verifiable taps. They're reusable across multiple surveys and don't require any app to use — just tap the card on any compatible phone.",
  },
  {
    question: "What devices are compatible?",
    answer:
      "TapIn Survey cards work with most modern smartphones. This includes most Android phones and iPhones (iPhone 7 and later). No app installation is required — the phone's built-in reader handles everything.",
  },
  {
    question: "What data does SurveySeal collect?",
    answer:
      "SurveySeal collects survey responses along with verification metadata: verification status (verified, unverified, or partial), checkpoint results, and timestamps. All data is exportable as CSV. SurveySeal does not track location or collect personal device information.",
  },
  {
    question: "Do respondents need to install an app?",
    answer:
      "No. Respondents don't need to install anything. When they tap a TapIn Survey card on their phone, it opens a web page in their default browser. Respondents without a TapIn card can skip verification checkpoints and still complete the survey — their responses will be marked as unverified.",
  },
  {
    question: "Can I make my survey anonymous?",
    answer:
      "Yes. By default, respondents sign in with Google or Microsoft before taking a survey. You can turn this off in your survey settings to allow fully anonymous responses — respondents can optionally provide an email, or leave it blank.",
  },
  {
    question: "How do I get started?",
    answer:
      "Sign in with your Google or Microsoft account, create a survey in the dashboard, and distribute TapIn Survey cards to your respondents. The survey builder is designed to be simple — no technical expertise required.",
  },
];

export function FaqAccordion() {
  return (
    <Accordion type="single" collapsible className="w-full">
      {faqs.map((faq, index) => (
        <AccordionItem key={index} value={`item-${index}`}>
          <AccordionTrigger>{faq.question}</AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            {faq.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
