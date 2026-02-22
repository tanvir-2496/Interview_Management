"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { getPermissions } from "@/lib/utils";

export default function AppShell({ children, interviewerOnly = false }: { children: React.ReactNode; interviewerOnly?: boolean }) {
  const path = usePathname();
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) router.replace("/login");
    const perms = getPermissions();
    const isInterviewer = perms.includes("Interviews.SubmitScorecard") && !perms.includes("Jobs.Create");
    if (interviewerOnly && !isInterviewer) router.replace("/dashboard");
    if (!interviewerOnly && isInterviewer && path.startsWith("/dashboard")) router.replace("/interviewer");
  }, [interviewerOnly, path, router]);

  const logout = () => {
    localStorage.clear();
    router.push("/login");
  };

  return (
    <div className="grid min-h-screen md:grid-cols-[240px_1fr]">
      <aside className="bg-brand-700 text-white p-4 space-y-2">
        <div className="text-lg font-bold">ATS Lite</div>
        {!interviewerOnly && (
          <>
            <Link className="block" href="/dashboard">Dashboard</Link>
            <Link className="block" href="/jobs">Jobs</Link>
            <Link className="block" href="/candidates">Candidates</Link>
            <Link className="block" href="/interviews">Interviews</Link>
            <Link className="block" href="/settings">Settings</Link>
          </>
        )}
        {interviewerOnly && <Link className="block" href="/interviewer">My Interviews</Link>}
        <button className="bg-white text-brand-700 mt-4" onClick={logout}>Logout</button>
      </aside>
      <main className="p-5">{children}</main>
    </div>
  );
}
