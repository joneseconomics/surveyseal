"use client";

export function LocalDate({ date }: { date: string | Date }) {
  return <>{new Date(date).toLocaleString()}</>;
}
