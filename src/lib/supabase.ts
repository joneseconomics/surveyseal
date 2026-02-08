import { createClient } from "@supabase/supabase-js";

const BUCKET = "cj-files";

// Client-side Supabase client (uses anon key — safe to expose)
export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key);
}

// Server-side Supabase client (uses service role key — never expose to browser)
export function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase server env vars");
  return createClient(url, key);
}

/** Build a storage path: {surveyId}/{fileId}-{sanitizedFileName} */
export function getCJFilePath(
  surveyId: string,
  fileId: string,
  fileName: string,
) {
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${surveyId}/${fileId}-${sanitized}`;
}

/** Get the public URL for a file in the cj-files bucket */
export function getPublicUrl(path: string) {
  const supabase = getSupabase();
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export { BUCKET };
