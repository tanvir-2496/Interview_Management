"use client";

export function toDhaka(utc: string) {
  return new Date(utc).toLocaleString("en-US", { timeZone: "Asia/Dhaka" });
}

export function getPermissions(): string[] {
  if (typeof window === "undefined") return [];
  const p = localStorage.getItem("permissions");
  if (!p) return [];
  try {
    return JSON.parse(p);
  } catch {
    return [];
  }
}
