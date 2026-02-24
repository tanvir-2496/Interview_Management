"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import Link from "next/link";

type JobItem = {
  id: string;
  title: string;
  department: string;
  locationText: string;
  jobCode: string;
  employmentType: number;
  status: number;
  applicationDeadlineUtc?: string | null;
  createdAtUtc: string;
};

function statusText(v: number) {
  if (v === 1) return "DRAFT";
  if (v === 2) return "PENDING APPROVAL";
  if (v === 3) return "OPEN";
  if (v === 4) return "CLOSED";
  return "UNKNOWN";
}

function statusClass(v: number) {
  if (v === 3) return "bg-emerald-100 text-emerald-700";
  if (v === 2) return "bg-amber-100 text-amber-700";
  if (v === 4) return "bg-slate-200 text-slate-700";
  return "bg-blue-100 text-blue-700";
}

function employmentTypeText(v: number) {
  if (v === 1) return "Permanent";
  if (v === 3) return "Contractual";
  if (v === 4) return "Intern";
  if (v === 2) return "Part Time";
  return "Permanent";
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [candidateCounts, setCandidateCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const load = async () => {
    const res = await api.get("/api/jobs?page=1&pageSize=200");
    setJobs(res.data.items ?? []);
    setCandidateCounts(res.data.candidateCounts ?? {});
  };

  useEffect(() => {
    load().catch(() => setError("Failed to load job list."));
  }, []);

  const remove = async (id: string) => {
    if (!confirm("Delete this job post?")) return;
    await api.delete(`/api/jobs/${id}`);
    setOpenMenuId(null);
    await load();
  };

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      const aDeadline = a.applicationDeadlineUtc ? new Date(a.applicationDeadlineUtc).getTime() : Number.NEGATIVE_INFINITY;
      const bDeadline = b.applicationDeadlineUtc ? new Date(b.applicationDeadlineUtc).getTime() : Number.NEGATIVE_INFINITY;
      if (aDeadline !== bDeadline) return bDeadline - aDeadline;
      return new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime();
    });
  }, [jobs]);

  return (
    <div className="mx-auto max-w-[1300px] space-y-3 text-[#2b3028]">
      <h1 className="text-2xl font-bold">Manage Jobs</h1>
      {error ? <div className="rounded border border-red-200 bg-red-50 px-4 py-2 text-red-700">{error}</div> : null}

      <div className="space-y-3">
        {sortedJobs.length === 0 ? <div className="rounded border border-[#d6cfbc] bg-white px-4 py-6 text-sm text-slate-500">No jobs found.</div> : null}

        {sortedJobs.map((j) => {
          const count = candidateCounts[j.id] ?? 0;
          return (
            <div key={j.id} className="rounded border border-[#d6cfbc] bg-[#f4f1e6]">
              <div className="flex items-start justify-between gap-3 border-b border-[#ddd7c6] px-4 py-4">
                <div>
                  <div className="text-xl font-semibold text-[#2d2f25]">{j.title}</div>
                  <div className="mt-1 text-xs text-[#7c806c]">{j.locationText} | {j.department} | {employmentTypeText(j.employmentType)}</div>
                  <div className="mt-1 inline-block rounded-full bg-[#ece7d8] px-2 py-0.5 text-[10px] font-semibold tracking-[0.1em] text-[#6f7460]">
                    {j.jobCode}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-[10px] font-semibold tracking-[0.1em] ${statusClass(j.status)}`}>
                    {statusText(j.status)}
                  </span>
                  <div className="relative">
                    <button
                      className="rounded border border-[#d4cebc] bg-white px-2 py-1 text-sm leading-none text-[#5f644f]"
                      onClick={() => setOpenMenuId((prev) => prev === j.id ? null : j.id)}
                    >
                      ...
                    </button>
                    {openMenuId === j.id ? (
                      <div className="absolute right-0 z-20 mt-1 w-28 rounded border border-[#d4cebc] bg-white shadow">
                        <Link
                          href={`/jobs/${j.id}`}
                          className="block border-b border-[#ece7d8] px-3 py-2 text-xs text-[#4d5240] hover:bg-slate-50"
                          onClick={() => setOpenMenuId(null)}
                        >
                          Edit
                        </Link>
                        <button
                          className="block w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"
                          onClick={() => remove(j.id)}
                        >
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                <div className="flex items-end gap-2">
                  <div className="text-5xl font-semibold leading-none text-[#21251d]">{count}</div>
                  <div className="pb-1 text-sm text-[#727762]">Candidates</div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-xs text-[#7e826e]">
                    Deadline: {j.applicationDeadlineUtc ? new Date(j.applicationDeadlineUtc).toLocaleDateString() : "N/A"}
                  </div>
                  <Link
                    href={`/candidates?jobId=${j.id}`}
                    className="border border-[#365249] bg-[#365249] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white"
                  >
                    View Candidates
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
