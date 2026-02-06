import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { randomBytes } from "crypto";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create test researcher
  const researcher = await prisma.user.upsert({
    where: { email: "researcher@test.edu" },
    update: {},
    create: {
      email: "researcher@test.edu",
      name: "Dr. Test Researcher",
      role: "RESEARCHER",
      institution: "Test University",
    },
  });

  console.log("Created researcher:", researcher.email);

  // Create test NFC card
  const card = await prisma.card.upsert({
    where: { uid: "04A1B2C3D4E5F6" },
    update: {},
    create: {
      uid: "04A1B2C3D4E5F6",
      aesKey: randomBytes(16).toString("hex"),
      label: "Test Card #1",
      ownerId: researcher.id,
    },
  });

  console.log("Created card:", card.uid);

  // Create sample survey with questions
  const survey = await prisma.survey.upsert({
    where: { id: "seed-survey-001" },
    update: {},
    create: {
      id: "seed-survey-001",
      title: "Campus Dining Experience Survey",
      description:
        "Help us understand your experience with campus dining facilities. This survey takes approximately 5 minutes and includes three verification checkpoints.",
      status: "DRAFT",
      ownerId: researcher.id,
    },
  });

  console.log("Created survey:", survey.title);

  // Create questions with checkpoints
  const questions = [
    {
      position: 0,
      type: "MULTIPLE_CHOICE" as const,
      isCheckpoint: true,
      content: {
        text: "Opening Checkpoint — Tap your NFC card to begin",
      },
    },
    {
      position: 1,
      type: "MULTIPLE_CHOICE" as const,
      content: {
        text: "How often do you eat at campus dining halls?",
        options: ["Daily", "3-4 times/week", "1-2 times/week", "Rarely", "Never"],
      },
    },
    {
      position: 2,
      type: "LIKERT" as const,
      content: {
        text: "Rate the quality of food at campus dining halls.",
        scale: { min: 1, max: 5, minLabel: "Very Poor", maxLabel: "Excellent" },
      },
    },
    {
      position: 3,
      type: "FREE_TEXT" as const,
      content: {
        text: "What is your favorite dish from the campus dining hall?",
      },
    },
    {
      position: 4,
      type: "MULTIPLE_CHOICE" as const,
      isCheckpoint: true,
      content: {
        text: "Mid-Survey Checkpoint — Tap your NFC card to continue",
      },
    },
    {
      position: 5,
      type: "LIKERT" as const,
      content: {
        text: "Rate the cleanliness of the dining facilities.",
        scale: { min: 1, max: 5, minLabel: "Very Poor", maxLabel: "Excellent" },
      },
    },
    {
      position: 6,
      type: "MATRIX" as const,
      content: {
        text: "Rate each aspect of your dining experience:",
        rows: ["Speed of service", "Staff friendliness", "Menu variety", "Value for money"],
        columns: ["Poor", "Fair", "Good", "Very Good", "Excellent"],
      },
    },
    {
      position: 7,
      type: "RANKING" as const,
      content: {
        text: "Rank the following improvements in order of importance:",
        options: [
          "More healthy options",
          "Extended hours",
          "Better prices",
          "More seating",
          "Faster service",
        ],
      },
    },
    {
      position: 8,
      type: "FREE_TEXT" as const,
      content: {
        text: "Any additional comments or suggestions for campus dining?",
      },
    },
    {
      position: 9,
      type: "MULTIPLE_CHOICE" as const,
      isCheckpoint: true,
      content: {
        text: "Closing Checkpoint — Tap your NFC card to submit",
      },
    },
  ];

  for (const q of questions) {
    await prisma.question.upsert({
      where: {
        surveyId_position: { surveyId: survey.id, position: q.position },
      },
      update: {},
      create: {
        surveyId: survey.id,
        position: q.position,
        type: q.type,
        content: q.content,
        isCheckpoint: q.isCheckpoint ?? false,
      },
    });
  }

  console.log(`Created ${questions.length} questions (3 checkpoints)`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
