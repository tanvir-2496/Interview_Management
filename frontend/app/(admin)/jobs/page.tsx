"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Link from "next/link";

function employmentTypeText(v: number) {
  if (v === 1) return "Permanent";
  if (v === 3) return "Contractual";
  if (v === 4) return "Intern";
  if (v === 2) return "Part Time";
  return "Permanent";
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [error, setError] = useState("");
  const load = () => api.get("/api/jobs").then((r) => setJobs(r.data.items));
  useEffect(() => {
    load().catch(() => setError("Job list load করা যায়নি।"));
  }, []);

  const remove = async (id: string) => {
    if (!confirm("Delete this job post?")) return;
    await api.delete(`/api/jobs/${id}`);
    await load();
  };

  const statusText = (v: number) => {
    if (v === 1) return "Draft";
    if (v === 2) return "Pending Approval";
    if (v === 3) return "Active";
    if (v === 4) return "Closed";
    return "Unknown";
  };

  const statusClass = (v: number) => {
    if (v === 3) return "bg-emerald-100 text-emerald-700";
    if (v === 2) return "bg-amber-100 text-amber-700";
    if (v === 4) return "bg-slate-200 text-slate-700";
    return "bg-blue-100 text-blue-700";
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">All Job Posts</h1>
        <Link href="/jobs/new" className="bg-brand-500 text-white">New Job</Link>
      </div>
      {error ? <div className="card text-red-600">{error}</div> : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
          <div>Job Title</div>
          <div>Type</div>
          <div>Deadline</div>
          <div>Status</div>
          <div>Actions</div>
        </div>

        {jobs.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-500">No jobs found.</div>
        ) : jobs.map((j) => (
          <div key={j.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center gap-3 border-b border-slate-100 px-4 py-4 text-sm">
            <div>
              <div className="font-semibold text-slate-900">{j.title}</div>
              <div className="text-xs text-slate-500">{j.department} · Vacancies: {j.vacancyCount}</div>
            </div>
            <div className="text-slate-700">{employmentTypeText(j.employmentType)}</div>
            <div className="text-slate-700">{j.applicationDeadlineUtc ? new Date(j.applicationDeadlineUtc).toLocaleDateString() : "N/A"}</div>
            <div>
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(j.status)}`}>
                {statusText(j.status)}
              </span>
            </div>
            <div className="flex gap-2">
              <Link className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50" href={`/jobs/${j.id}`}>Edit</Link>
              <button className="rounded bg-red-600 px-2 py-1 text-xs text-white" onClick={() => remove(j.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
