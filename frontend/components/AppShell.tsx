"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getPermissions } from "@/lib/utils";
import { defaultCompanyProfile, loadPublicCompanyProfile } from "@/lib/companyProfile";

export default function AppShell({ children, interviewerOnly = false }: { children: React.ReactNode; interviewerOnly?: boolean }) {
  const path = usePathname();
  const router = useRouter();
  const [company, setCompany] = useState(defaultCompanyProfile);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) router.replace("/login");
    const perms = getPermissions();
    const isInterviewer = perms.includes("Interviews.SubmitScorecard") && !perms.includes("Jobs.Create");
    if (interviewerOnly && !isInterviewer) router.replace("/dashboard");
    if (!interviewerOnly && isInterviewer && path.startsWith("/dashboard")) router.replace("/interviewer");
  }, [interviewerOnly, path, router]);

  useEffect(() => {
    loadPublicCompanyProfile().then(setCompany).catch(() => setCompany(defaultCompanyProfile));
  }, []);

  const logout = () => {
    localStorage.clear();
    router.push("/login");
  };

  const isActive = (href: string) => path === href || path.startsWith(`${href}/`);
  const isSubActive = (href: string) => {
    if (href === "/jobs") return path === "/jobs";
    return path === href || path.startsWith(`${href}/`);
  };
  const pageTitle = path.split("/").filter(Boolean)[0] || "dashboard";

  const adminMenu = [
    { label: "Dashboard", href: "/dashboard", children: [] as Array<{ label: string; href?: string }> },
    {
      label: "Jobs",
      href: "/jobs",
      children: [
        { label: "New Requisition", href: "/jobs/new" },
        { label: "Manage Jobs", href: "/jobs" },
        { label: "Referrals", href: "/referrals" }
      ]
    },
    { label: "Candidates", href: "/candidates", children: [{ label: "All Candidates" }, { label: "Talent Pipeline" }] },
    { label: "Insights", href: "/interviews", children: [{ label: "Candidates" }, { label: "Interviews" }, { label: "Users" }, { label: "Reports" }] },
    { label: "Settings", href: "/settings", children: [{ label: "Company Settings", href: "/settings" }, { label: "Stages", href: "/stages" }] }
  ];

  return (
    <div className="grid min-h-screen md:grid-cols-[220px_1fr] bg-[#ece9dd] text-[#20231f]">
      <aside className="border-r border-[#2f5048] bg-[#23443d] text-[#d9e7e0]">
        <div className="flex h-14 items-center border-b border-[#2f5048] px-3">
          <div className="flex items-center gap-2">
            <img
              src={company.logoUrl || "/NAAS-Logo.png"}
              alt={`${company.companyName} logo`}
              width={30}
              height={30}
              className="h-8 w-8 rounded-md bg-white/10 object-contain p-0.5"
              onError={(e) => {
                const target = e.currentTarget;
                target.onerror = null;
                target.src = "/NAAS-Logo.png";
              }}
            />
            <span className="text-sm font-semibold tracking-wide">Recruitment</span>
          </div>
        </div>

        {!interviewerOnly ? (
          <nav className="space-y-2 px-2 py-3">
            {adminMenu.map((item) => (
              <div key={item.href} className="space-y-1">
                <Link
                  href={item.href}
                  className={`block rounded px-3 py-2 text-sm transition ${
                    isActive(item.href)
                      ? "bg-[#2f755f] text-white"
                      : "text-[#d2e1da] hover:bg-[#2a554b] hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
                {item.children.length > 0 ? (
                  <div className="ml-3 border-l border-[#32574d] pl-3">
                    {item.children.map((sub) => (
                      sub.href ? (
                        <Link
                          key={sub.label}
                          href={sub.href}
                          className={`block py-1 text-xs ${
                            isSubActive(sub.href) ? "text-white" : "text-[#96b5aa] hover:text-[#d8e7df]"
                          }`}
                        >
                          {sub.label}
                        </Link>
                      ) : (
                        <div key={sub.label} className="py-1 text-xs text-[#96b5aa]">{sub.label}</div>
                      )
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </nav>
        ) : (
          <nav className="px-3 py-3">
            <Link
              className={`block rounded px-3 py-2 text-sm transition ${
                isActive("/interviewer")
                  ? "bg-[#2f755f] text-white"
                  : "text-[#d2e1da] hover:bg-[#2a554b] hover:text-white"
              }`}
              href="/interviewer"
            >
              My Interviews
            </Link>
          </nav>
        )}

        <div className="p-3">
          <button className="w-full bg-[#f4f1e6] text-[#1f3b35]" onClick={logout}>Sign off</button>
        </div>
      </aside>

      <section className="min-w-0">
        <header className="flex h-14 items-center justify-between border-b border-[#d7d1bf] bg-[#f3f0e5] px-6">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a876f]">{pageTitle}</div>
          <div className="flex items-center gap-3 text-[#78755f]">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-[#35594f] text-xs text-white">M</span>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </section>
    </div>
  );
}
