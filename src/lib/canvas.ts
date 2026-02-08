/**
 * Canvas LMS REST API client (server-side only).
 * All functions require a Canvas base URL and API token.
 */

export interface CanvasCourse {
  id: number;
  name: string;
  course_code: string;
  enrollment_term_id: number;
}

export interface CanvasAssignment {
  id: number;
  name: string;
  due_at: string | null;
  group_category_id: number | null;
  submission_types: string[];
  has_submitted_submissions: boolean;
}

export interface CanvasUser {
  id: number;
  name: string;
  email?: string;
  login_id?: string;
}

export interface CanvasAttachment {
  id: number;
  display_name: string;
  filename: string;
  url: string;
  size: number;
  content_type: string;
}

export interface CanvasSubmission {
  id: number;
  user_id: number;
  user?: CanvasUser;
  submission_type: string | null;
  body: string | null;
  url: string | null;
  attachments?: CanvasAttachment[];
  workflow_state: string;
  submitted_at: string | null;
}

async function canvasFetch<T>(
  baseUrl: string,
  token: string,
  path: string,
  params?: Record<string, string>,
): Promise<T[]> {
  const results: T[] = [];
  const url = new URL(`/api/v1${path}`, baseUrl);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  url.searchParams.set("per_page", "100");

  let nextUrl: string | null = url.toString();

  while (nextUrl) {
    const res = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Canvas API error ${res.status}: ${text}`);
    }

    const data: T[] = await res.json();
    results.push(...data);

    // Handle Canvas pagination via Link header
    const linkHeader = res.headers.get("Link");
    nextUrl = parseLinkNext(linkHeader);
  }

  return results;
}

function parseLinkNext(header: string | null): string | null {
  if (!header) return null;
  const parts = header.split(",");
  for (const part of parts) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/);
    if (match) return match[1];
  }
  return null;
}

export async function fetchCourses(
  baseUrl: string,
  token: string,
): Promise<CanvasCourse[]> {
  return canvasFetch<CanvasCourse>(baseUrl, token, "/courses", {
    enrollment_type: "teacher",
  });
}

export async function fetchAssignments(
  baseUrl: string,
  token: string,
  courseId: number,
): Promise<CanvasAssignment[]> {
  return canvasFetch<CanvasAssignment>(
    baseUrl,
    token,
    `/courses/${courseId}/assignments`,
  );
}

export async function fetchSubmissions(
  baseUrl: string,
  token: string,
  courseId: number,
  assignmentId: number,
): Promise<CanvasSubmission[]> {
  return canvasFetch<CanvasSubmission>(
    baseUrl,
    token,
    `/courses/${courseId}/assignments/${assignmentId}/submissions`,
    { "include[]": "user" },
  );
}

export async function downloadFile(
  token: string,
  fileUrl: string,
): Promise<Buffer> {
  const res = await fetch(fileUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to download file: ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
