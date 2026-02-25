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
  currentStage?: string;
  currentJobId?: string;
};

type StageConfig = {
  stageName: string;
  stageOrder: number;
  isActive: boolean;
};

function stageFromCandidate(candidate: Candidate) {
  if (candidate.currentStage && candidate.currentStage.trim().length > 0) return candidate.currentStage.trim();
  if (candidate.resumeParseStatus === 2) return "Video Screen";
  if (candidate.resumeParseStatus === 3) return "Rejected";
  return "Applied";
}

function stageBadgeClass(stage: string) {
  const key = stage.toLowerCase();
  if (key.includes("reject")) return "bg-rose-100 text-rose-700";
  if (key.includes("screen") || key.includes("video")) return "bg-cyan-100 text-cyan-700";
  if (key.includes("offer") || key.includes("hire")) return "bg-emerald-100 text-emerald-700";
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
  const [stageTabs, setStageTabs] = useState<string[]>([]);
  const [activeStage, setActiveStage] = useState("All");
  const [rejectingCandidateId, setRejectingCandidateId] = useState<string | null>(null);

  const load = async () => {
    try {
      const candidateQuery = jobId
        ? `/api/candidates?page=1&pageSize=500&jobId=${jobId}`
        : "/api/candidates?page=1&pageSize=500";

      const candidateReq = api.get(candidateQuery);
      const jobReq = jobId ? api.get(`/api/jobs/${jobId}`) : Promise.resolve({ data: null });
      const stageReq = jobId
        ? api.get("/api/settings/stages", { params: { jobId } })
        : Promise.resolve({ data: [] as StageConfig[] });

      const [candidateRes, jobRes, stageRes] = await Promise.all([candidateReq, jobReq, stageReq]);
      const loadedItems = (candidateRes.data.items ?? []) as Candidate[];
      setItems(loadedItems);

      if (jobId) {
        setJobTitle(jobRes.data?.title ?? "");
      } else {
        setJobTitle("");
      }

      let tabs: string[] = [];
      if (jobId) {
        const configured = ((stageRes.data ?? []) as StageConfig[])
          .filter((x) => x?.isActive)
          .sort((a, b) => (a?.stageOrder ?? 0) - (b?.stageOrder ?? 0))
          .map((x) => String(x?.stageName ?? "").trim())
          .filter((x) => x.length > 0);
        tabs = Array.from(new Set(configured));
      }

      const fromCandidates = Array.from(new Set(loadedItems.map((x) => stageFromCandidate(x)).filter((x) => x.length > 0)));
      if (tabs.length === 0) tabs = fromCandidates;
      else tabs = Array.from(new Set([...tabs, ...fromCandidates]));

      const normalizedRejected = tabs.find((x) => x.toLowerCase() === "rejected") ?? "Rejected";
      tabs = [normalizedRejected, ...tabs.filter((x) => x.toLowerCase() !== "rejected")];

      setStageTabs(tabs);
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
    setActiveStage("All");
  }, [jobId]);

  useEffect(() => {
    load();
  }, [jobId]);

  useEffect(() => {
    if (activeStage !== "All" && !stageTabs.includes(activeStage)) {
      setActiveStage("All");
    }
  }, [activeStage, stageTabs]);

  const searchedItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((c) =>
      `${c.fullName} ${c.email} ${c.phone} ${sourceTag(c.source)} ${stageFromCandidate(c)}`.toLowerCase().includes(query)
    );
  }, [items, search]);

  const visibleItems = useMemo(() => {
    if (activeStage === "All") return searchedItems;
    return searchedItems.filter((c) => stageFromCandidate(c) === activeStage);
  }, [searchedItems, activeStage]);

  const stageCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    searchedItems.forEach((c) => {
      const stage = stageFromCandidate(c);
      map[stage] = (map[stage] ?? 0) + 1;
    });
    return map;
  }, [searchedItems]);

  const orderedStageTabs = useMemo(() => {
    const unique = Array.from(new Set(stageTabs.map((x) => x.trim()).filter((x) => x.length > 0)));
    const rejected = unique.find((x) => x.toLowerCase() === "rejected") ?? "Rejected";
    const rest = unique.filter((x) => x.toLowerCase() !== "rejected");
    return [rejected, ...rest];
  }, [stageTabs]);

  const rejectCandidate = async (candidate: Candidate) => {
    const targetJobId = jobId || candidate.currentJobId || "";
    if (!targetJobId) {
      setError("This candidate has no linked job context for rejection.");
      return;
    }
    setError("");
    setRejectingCandidateId(candidate.id);
    try {
      await api.post("/api/candidates/bulk-stage-move", {
        candidateIds: [candidate.id],
        jobId: targetJobId,
        stage: "Rejected"
      });
      await load();
      setActiveStage("Rejected");
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.response?.data?.message || "Reject failed.");
    } finally {
      setRejectingCandidateId(null);
    }
  };

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

        <div className="mt-4 border-y border-[#ddd7c6] py-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <button
              type="button"
              onClick={() => setActiveStage("All")}
              className={`text-left ${activeStage === "All" ? "font-semibold text-[#20251e]" : "text-[#4f5446]"}`}
            >
              <span className="mr-1">{searchedItems.length}</span>
              All
            </button>

            {orderedStageTabs.map((stage) => (
              <button
                key={stage}
                type="button"
                onClick={() => setActiveStage(stage)}
                className={`text-left ${activeStage === stage ? "font-semibold text-[#20251e]" : "text-[#4f5446]"}`}
              >
                <span className="mr-1">{stageCountMap[stage] ?? 0}</span>
                {stage}
              </button>
            ))}
          </div>
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
        <div className="grid grid-cols-[40px_2fr_1.2fr_1fr_1fr_150px] border-b border-[#ece7d8] px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#7b7f6a]">
          <div />
          <div>Name</div>
          <div>Stage</div>
          <div>Applied</div>
          <div>Tags</div>
          <div>Actions</div>
        </div>

        {visibleItems.length === 0 ? (
          <div className="px-4 py-8 text-sm text-[#8b866f]">No candidates found.</div>
        ) : visibleItems.map((c) => {
          const stage = stageFromCandidate(c);
          const rating = ratingValue(c.yearsOfExperience);
          const tags = [sourceTag(c.source), c.resumeParseStatus === 2 ? "Parsed CV" : "Pending Parse"];
          const candidateHref = (jobId || c.currentJobId)
            ? `/candidates/${c.id}?jobId=${jobId || c.currentJobId}`
            : `/candidates/${c.id}`;
          return (
            <div key={c.id} className="grid grid-cols-[40px_2fr_1.2fr_1fr_1fr_150px] items-center border-b border-[#f1ecdf] px-4 py-3 text-sm">
              <div><input className="h-4 w-4 !w-4 !px-0 !py-0" type="checkbox" /></div>
              <div>
                <Link href={candidateHref} className="font-semibold text-[#2f443d] underline-offset-2 hover:underline">{c.fullName}</Link>
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
              <div className="flex items-center justify-end gap-2">
                <div className="text-[#7a7f69]">{rating} / 5</div>
                {(jobId || c.currentJobId) && stage.toLowerCase() !== "rejected" ? (
                  <button
                    type="button"
                    className="bg-rose-600 px-2 py-1 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                    onClick={() => rejectCandidate(c)}
                    disabled={rejectingCandidateId === c.id}
                  >
                    {rejectingCandidateId === c.id ? "Rejecting..." : "Reject"}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

