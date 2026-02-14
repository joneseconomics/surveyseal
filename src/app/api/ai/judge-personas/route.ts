import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { extractCvText } from "@/lib/ai/extract-cv-text";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const personas = await db.judgePersona.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      title: true,
      description: true,
      cvFileName: true,
      createdAt: true,
      createdBy: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({ personas });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const name = formData.get("name") as string | null;
  const title = formData.get("title") as string | null;
  const description = formData.get("description") as string | null;
  const file = formData.get("file") as File | null;

  if (!name?.trim() || !title?.trim() || !description?.trim()) {
    return NextResponse.json(
      { error: "Name, title, and description are required" },
      { status: 400 },
    );
  }

  if (!file) {
    return NextResponse.json({ error: "CV file is required" }, { status: 400 });
  }

  const ext = file.name.toLowerCase().split(".").pop();
  if (ext !== "docx" && ext !== "pdf") {
    return NextResponse.json(
      { error: "Only .docx and .pdf files are supported" },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 10MB." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let cvText: string;
  try {
    cvText = await extractCvText(buffer, file.name);
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to extract text: ${e instanceof Error ? e.message : "Unknown error"}` },
      { status: 422 },
    );
  }

  if (!cvText.trim()) {
    return NextResponse.json(
      { error: "No text could be extracted from the file" },
      { status: 422 },
    );
  }

  const persona = await db.judgePersona.create({
    data: {
      name: name.trim(),
      title: title.trim(),
      description: description.trim(),
      cvText,
      cvFileName: file.name,
      createdById: session.user.id,
    },
    select: {
      id: true,
      name: true,
      title: true,
      description: true,
      cvFileName: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ persona }, { status: 201 });
}
