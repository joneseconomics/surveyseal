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
    question: "How does human-factor authentication (HFA) work?",
    answer:
      "Each survey includes three verification points: opening, mid-survey, and closing. At each verification point, a countdown timer gives the respondent time to tap their TapIn Identity card on their phone. After tapping, the TapIn platform shows a green checkmark, and the respondent clicks Continue. After the survey, you can reconcile TapIn tap logs with SurveySeal sessions by email and timestamp. Respondents without a card can skip verification points — their responses are tagged as unverified.",
  },
  {
    question: "What is TapIn?",
    answer:
      "TapIn (tapin.me) is the smart card platform that powers SurveySeal's physical-tap verification. TapIn produces credit-card-sized smart cards with built-in hardware security — each card carries a unique identity that generates verifiable taps impossible to clone, share, or replay. When a respondent taps their TapIn card on their phone, the TapIn platform verifies the tap and matches it to the respondent's email. SurveySeal uses this to confirm that the person taking the survey is physically present and real.",
  },
  {
    question: "What are TapIn Identity cards?",
    answer:
      "TapIn Identity cards are physical smart cards that provide Human Factor Authentication (HFA) — a verification method that requires a real human to be physically present with their card. Unlike software-based authentication (passwords, biometrics, CAPTCHAs), HFA uses a physical token that cannot be cloned, shared remotely, or automated by bots. Each card carries a unique cryptographic identity that generates verifiable taps, proving the respondent is a real person who is actually there. They're durable, reusable across multiple surveys, and don't require any app — just tap the card on any compatible phone. You can order TapIn Identity cards at tapin.me.",
  },
  {
    question: "What devices are compatible?",
    answer:
      "TapIn Identity cards use NFC (Near Field Communication) to communicate with your phone, so the device needs to have an NFC reader. Most modern smartphones have one built in — this includes most Android phones and iPhones (iPhone 7 and later). No app installation is required — the phone's built-in NFC reader handles everything.",
  },
  {
    question: "What data does SurveySeal collect?",
    answer:
      "SurveySeal collects survey responses along with verification metadata: verification status (verified, unverified, or partial), verification point results, and timestamps. All data is exportable as CSV. SurveySeal does not track location or collect personal device information.",
  },
  {
    question: "Do respondents need to install an app?",
    answer:
      "No. Respondents don't need to install anything. When they tap a TapIn Identity card on their phone, it opens a web page in their default browser. Respondents without a TapIn card can skip verification points and still complete the survey — their responses will be marked as unverified.",
  },
  {
    question: "Can I make my survey anonymous?",
    answer:
      "Yes. By default, respondents sign in with Google before taking a survey. You can turn this off in your survey settings to allow fully anonymous responses — respondents can optionally provide an email, or leave it blank.",
  },
  {
    question: "How do I get started?",
    answer:
      "Sign in with your Google account, create a survey in the dashboard, and distribute TapIn Identity cards to your respondents. For Comparative Judgment surveys, upload items (or import from Canvas), share the link with judges, and view rankings as results come in. The survey builder is designed to be simple — no technical expertise required.",
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
