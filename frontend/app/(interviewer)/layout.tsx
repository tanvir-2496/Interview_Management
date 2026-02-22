"use client";

import AppShell from "@/components/AppShell";

export default function InterviewerLayout({ children }: { children: React.ReactNode }) {
  return <AppShell interviewerOnly>{children}</AppShell>;
}
