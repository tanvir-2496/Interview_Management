"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import Link from "next/link";

type Candidate = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  source: number;
  yearsOfExperience: number;
  resumeParseStatus: number;
  createdAtUtc: string;
};

function stageFromCandidate(candidate: Candidate) {
  if (candidate.resumeParseStatus === 2) return "Video Screen";
  if (candidate.resumeParseStatus === 3) return "Rejected";
  return "Applied";
}

function stageBadgeClass(stage: string) {
  if (stage === "Rejected") return "bg-rose-100 text-rose-700";
  if (stage === "Video Screen") return "bg-cyan-100 text-cyan-700";
  return "bg-amber-100 text-amber-700";
}

function sourceTag(source: number) {
  if (source === 1) return "LinkedIn";
  if (source === 2) return "Referral";
  if (source === 3) return "WhatsApp";
  if (source === 4) return "Portal";
  if (source === 6) return "Facebook";
  return "Other";
}

function ratingValue(years: number) {
  if (years >= 8) return 5;
  if (years >= 6) return 4;
  if (years >= 3) return 3;
  if (years >= 1) return 2;
  return 1;
}

export default function CandidatesPage() {
  const [jobId, setJobId] = useState("");
  const [items, setItems] = useState<Candidate[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [jobTitle, setJobTitle] = useState("");

  const load = async () => {
    try {
      const query = jobId ? `/api/candidates?page=1&pageSize=500&jobId=${jobId}` : "/api/candidates?page=1&pageSize=500";
      const res = await api.get(query);
      setItems(res.data.items ?? []);

      if (jobId) {
        const jobRes = await api.get(`/api/jobs/${jobId}`);
        setJobTitle(jobRes.data?.title ?? "");
      } else {
        setJobTitle("");
      }

      setError("");
    } catch {
      setError("Failed to load candidates.");
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const queryJobId = new URLSearchParams(window.location.search).get("jobId") ?? "";
    setJobId(queryJobId);
  }, []);

  useEffect(() => {
    load();
  }, [jobId]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((c) =>
      `${c.fullName} ${c.email} ${c.phone} ${sourceTag(c.source)}`.toLowerCase().includes(query)
    );
  }, [items, search]);

  const stats = useMemo(() => {
    return filteredItems.reduce(
      (acc, c) => {
        const stage = stageFromCandidate(c);
        acc.total += 1;
        if (stage === "Rejected") acc.rejected += 1;
        if (stage === "Applied") acc.applied += 1;
        if (stage === "Video Screen") acc.videoScreen += 1;
        if (sourceTag(c.source) === "Referral") acc.referral += 1;
        if (sourceTag(c.source) === "Portal") acc.portal += 1;
        return acc;
      },
      { total: 0, rejected: 0, applied: 0, videoScreen: 0, referral: 0, portal: 0 }
    );
  }, [filteredItems]);

  return (
    <div className="mx-auto max-w-[1300px] space-y-4 text-[#2b3028]">
      {error ? <div className="rounded border border-red-200 bg-red-50 px-4 py-2 text-red-700">{error}</div> : null}

      <div className="rounded border border-[#d6cfbc] bg-[#f4f1e6] px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            {jobId ? (
              <div className="text-xs text-[#8a866f]">Jobs  &gt; {jobTitle || "Selected Job"}  &gt; Candidates</div>
            ) : null}
            <h1 className="mt-2 text-5xl font-semibold tracking-tight text-[#2b2e23]">Candidates</h1>
            <div className="mt-1 text-xs text-[#8f8a74]">
              {jobId ? "Showing candidates under selected job" : "Recruitment view for all available candidates"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">OPEN</span>
            <button className="border border-[#c8c2b2] bg-white text-xs font-semibold tracking-[0.1em] text-[#5d614f]">
              CREATE TASK
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-1 rounded border border-[#d3ccba] bg-[#2f4d43] p-1 text-xs md:grid-cols-7">
          {["Candidates", "Edit", "Scorecards", "Interviews", "Adverts", "Insights", "Share"].map((tab, idx) => (
            <div
              key={tab}
              className={`rounded px-3 py-2 text-center font-semibold ${idx === 0 ? "bg-white text-[#29473d]" : "text-[#d0dfd8]"}`}
            >
              {tab}
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-2 border-y border-[#ddd7c6] py-3 text-sm md:grid-cols-6">
          <div className="font-semibold">{stats.total} All</div>
          <div><span className="font-semibold text-rose-700">{stats.rejected}</span> Rejected</div>
          <div><span className="font-semibold text-amber-700">{stats.applied}</span> Applied</div>
          <div><span className="font-semibold text-cyan-700">{stats.videoScreen}</span> Video Screen</div>
          <div><span className="font-semibold text-[#3f5f53]">{stats.portal}</span> Portal</div>
          <div><span className="font-semibold text-[#3f5f53]">{stats.referral}</span> Referral</div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            className="md:w-[420px]"
            placeholder="Search candidates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="border border-[#d0cab8] bg-white text-xs font-semibold uppercase tracking-[0.12em] text-[#646955]">Advanced</button>
          <button className="border border-[#d0cab8] bg-white text-xs font-semibold uppercase tracking-[0.12em] text-[#646955]">Filters</button>
          <Link href="/referrals" className="ml-auto border border-[#2f4d43] bg-[#2f4d43] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white">
            Add Candidates
          </Link>
        </div>
      </div>

      <div className="rounded border border-[#d6cfbc] bg-white">
        <div className="grid grid-cols-[40px_2fr_1fr_1fr_1fr_110px] border-b border-[#ece7d8] px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#7b7f6a]">
          <div />
          <div>Name</div>
          <div>Stage</div>
          <div>Applied</div>
          <div>Tags</div>
          <div>Avg. Rating</div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="px-4 py-8 text-sm text-[#8b866f]">No candidates found.</div>
        ) : filteredItems.map((c) => {
          const stage = stageFromCandidate(c);
          const rating = ratingValue(c.yearsOfExperience);
          const tags = [sourceTag(c.source), c.resumeParseStatus === 2 ? "Parsed CV" : "Pending Parse"];
          return (
            <div key={c.id} className="grid grid-cols-[40px_2fr_1fr_1fr_1fr_110px] items-center border-b border-[#f1ecdf] px-4 py-3 text-sm">
              <div><input className="h-4 w-4 !w-4 !px-0 !py-0" type="checkbox" /></div>
              <div>
                <Link href={`/candidates/${c.id}`} className="font-semibold text-[#2f443d] underline-offset-2 hover:underline">{c.fullName}</Link>
                <div className="text-xs text-[#7f836f]">{c.email}</div>
              </div>
              <div>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${stageBadgeClass(stage)}`}>{stage}</span>
              </div>
              <div className="text-[#626652]">{new Date(c.createdAtUtc).toLocaleDateString()}</div>
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <span key={tag} className="rounded bg-[#edf3ef] px-2 py-1 text-[11px] text-[#4f6559]">{tag}</span>
                ))}
              </div>
              <div className="text-[#7a7f69]">{rating} / 5</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
