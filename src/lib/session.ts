import { cookies } from "next/headers";

const COOKIE_NAME = "surveyseal_session";

export async function getSurveySessionId(surveyId: string): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(`${COOKIE_NAME}_${surveyId}`);
  return cookie?.value ?? null;
}

export async function setSurveySessionId(surveyId: string, sessionId: string) {
  const cookieStore = await cookies();
  cookieStore.set(`${COOKIE_NAME}_${surveyId}`, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/s/${surveyId}`,
    maxAge: 60 * 60 * 4, // 4 hours
  });
}

export async function clearSurveySessionId(surveyId: string) {
  const cookieStore = await cookies();
  cookieStore.delete({
    name: `${COOKIE_NAME}_${surveyId}`,
    path: `/s/${surveyId}`,
  });
}
