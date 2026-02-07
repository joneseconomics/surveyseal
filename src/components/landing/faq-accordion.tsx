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
      "SurveySeal is a survey platform for academic research that uses physical-tap verification to prove respondents are real, physically present humans — not bots, proxies, or duplicate entries.",
  },
  {
    question: "How does physical-tap verification work?",
    answer:
      "Each survey includes checkpoints: an opening tap, a mid-survey attention check, and a closing tap. At each checkpoint, the respondent taps their TapIn Survey card on their phone. The card generates a unique code that produces a two-word verification phrase, valid for 90 seconds. This creates an unbroken chain of physical presence proof across the entire survey.",
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
      "SurveySeal collects survey responses along with verification metadata: card identifiers, tap timestamps, and proof of each checkpoint. All data is exportable as a research-ready CSV with a full verification chain for transparent peer review. SurveySeal does not track location or collect personal device information.",
  },
  {
    question: "Do respondents need to install an app?",
    answer:
      "No. Respondents don't need to install anything. When they tap a TapIn Survey card on their phone, it opens a web page in their default browser that displays the verification phrase. The entire process works through the browser.",
  },
  {
    question: "How do I get started?",
    answer:
      "Sign in with your Google or Microsoft account, create a survey in the dashboard, and distribute TapIn Survey cards to your respondents. The survey builder is designed for researchers — no technical expertise required. You can use Mock Mode during development to test the full flow without physical cards.",
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
