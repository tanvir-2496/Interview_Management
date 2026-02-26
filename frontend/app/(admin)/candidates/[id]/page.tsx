"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";

type Candidate = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  yearsOfExperience: number;
  createdAtUtc: string;
  source?: number;
  resumeParseStatus?: number;
};

type TimelineItem = {
  id: string;
  eventType: number;
  payloadJson: string;
  createdAtUtc: string;
};

type ApplicationItem = {
  applicationId: string;
  jobId: string;
  jobTitle: string;
  jobCode: string;
  department: string;
  locationText: string;
  applicationDeadlineUtc?: string;
  currentStage: string;
  status: number;
  appliedAtUtc: string;
};

type ResumeMeta = {
  id: string;
  originalFileName: string;
  mimeType: string;
  sizeInBytes: number;
  createdAtUtc: string;
};

type DetailTab = "Application" | "Resume" | "Offers" | "Scorecards" | "Comments" | "Interviews" | "Messages";

function stageBadge(stage: string) {
  const s = stage.toLowerCase();
  if (s.includes("reject")) return "bg-rose-100 text-rose-700 border-rose-200";
  if (s.includes("interview") || s.includes("screen")) return "bg-cyan-100 text-cyan-700 border-cyan-200";
  if (s.includes("hire") || s.includes("offer")) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  return "bg-amber-100 text-amber-700 border-amber-200";
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function formatDate(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString();
}

function initials(name: string) {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "C";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "C";
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function timelineEventLabel(code: number) {
  const map: Record<number, string> = {
    1: "Applied",
    2: "Stage Moved",
    3: "Interview Scheduled",
    4: "Score Submitted",
    5: "Rejected",
    6: "Hired",
    7: "Bulk Action",
    8: "Job Approval"
  };
  return map[code] ?? `Event ${code}`;
}

function sourceLabel(source?: number) {
  if (source === 1) return "LinkedIn";
  if (source === 2) return "Referral";
  if (source === 3) return "WhatsApp";
  if (source === 4) return "Portal";
  if (source === 6) return "Facebook";
  return "Other";
}

function buildDownloadName(originalFileName: string, candidateName: string, jobTitle?: string) {
  const safe = (value: string) => value.replace(/[<>:"/\\|?*\u0000-\u001F]+/g, " ").replace(/\s+/g, " ").trim();
  const lastDot = originalFileName.lastIndexOf(".");
  const hasExt = lastDot > 0 && lastDot < originalFileName.length - 1;
  const ext = hasExt ? originalFileName.slice(lastDot) : "";

  const namePart = safe(candidateName || "Candidate");
  const jobPart = safe(jobTitle || "Job");

  return `${namePart} - ${jobPart}${ext || ".pdf"}`;
}

export default function CandidateDetailPage({ params }: { params: { id: string } }) {
  const search = useSearchParams();
  const queryJobId = search.get("jobId") ?? "";

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [resumeMeta, setResumeMeta] = useState<ResumeMeta | null>(null);
  const [resumeUrl, setResumeUrl] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<DetailTab>("Resume");
  const [downloadingResume, setDownloadingResume] = useState(false);
  const [previewMessage, setPreviewMessage] = useState("Resume preview not available.");

  const selectedApplication = useMemo(() => {
    if (applications.length === 0) return null;
    if (!queryJobId) return applications[0];
    return applications.find((x) => x.jobId === queryJobId) ?? applications[0];
  }, [applications, queryJobId]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [candidateRes, timelineRes, applicationsRes, resumeRes] = await Promise.all([
        api.get(`/api/candidates/${params.id}`),
        api.get(`/api/candidates/${params.id}/timeline`),
        api.get(`/api/candidates/${params.id}/applications`),
        api.get(`/api/candidates/${params.id}/resumes/latest`).catch(() => ({ data: null }))
      ]);

      setCandidate(candidateRes.data as Candidate);
      setTimeline((timelineRes.data ?? []) as TimelineItem[]);
      setApplications((applicationsRes.data ?? []) as ApplicationItem[]);
      setResumeMeta((resumeRes.data ?? null) as ResumeMeta | null);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.response?.data?.message || "Failed to load candidate details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [params.id]);

  useEffect(() => {
    let objectUrl = "";
    if (!resumeMeta?.id) {
      setResumeUrl("");
      setPreviewMessage("Resume preview not available.");
      return;
    }

    api.get(`/api/candidates/resumes/${resumeMeta.id}/preview`, { responseType: "blob" })
      .then((res) => {
        objectUrl = URL.createObjectURL(res.data);
        setResumeUrl(objectUrl);
        setPreviewMessage("Resume preview not available.");
      })
      .catch((e: any) => {
        setResumeUrl("");
        setPreviewMessage(e?.response?.data?.detail || e?.response?.data?.message || "This file cannot be previewed. Please download it.");
      });

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [resumeMeta]);

  if (loading) {
    return (
      <div className="rounded border border-[#d6cfbc] bg-[#f5f2e8] px-5 py-6 text-sm text-[#666b59]">
        Loading candidate details...
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="rounded border border-red-200 bg-red-50 px-5 py-4 text-red-700">
        Candidate not found.
      </div>
    );
  }

  const stageLabel = selectedApplication?.currentStage ?? "Applied";
  const detailTabs: DetailTab[] = ["Application", "Resume", "Offers", "Scorecards", "Comments", "Interviews", "Messages"];
  const downloadFileName = resumeMeta
    ? buildDownloadName(resumeMeta.originalFileName, candidate.fullName, selectedApplication?.jobTitle)
    : "resume.pdf";

  const downloadResume = async () => {
    if (!resumeMeta?.id) return;
    setError("");
    setDownloadingResume(true);
    try {
      const res = await api.get(`/api/candidates/resumes/${resumeMeta.id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = downloadFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.response?.data?.message || "Download failed.");
    } finally {
      setDownloadingResume(false);
    }
  };

  return (
    <div className="space-y-4 text-[#282c23]">
      {error ? <div className="rounded border border-red-200 bg-red-50 px-4 py-2 text-red-700">{error}</div> : null}

      <div className="rounded border border-[#d6cfbc] bg-[#f4f1e6]">
        <div className="border-b border-[#ddd7c6] px-5 py-3 text-xs text-[#8d8970]">
          <span>Jobs</span>
          <span className="mx-1">&gt;</span>
          <span>{selectedApplication?.jobTitle ?? "Candidate Pipeline"}</span>
          <span className="mx-1">&gt;</span>
          <span>Candidates</span>
          <span className="mx-1">&gt;</span>
          <span>{stageLabel}</span>
          <span className="mx-1">&gt;</span>
          <span className="font-semibold text-[#5b5f4e]">{candidate.fullName}</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div>
            <h1 className="text-5xl font-semibold tracking-tight text-[#2b2f25]">
              {selectedApplication?.jobTitle ?? "Candidate Detail"}
            </h1>
            <p className="mt-1 text-xs text-[#8d8970]">
              {selectedApplication ? `${selectedApplication.locationText} - ${selectedApplication.department} - ${selectedApplication.jobCode}` : "No job linked yet"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">OPEN</span>
            <button className="border border-[#cbc4b3] bg-white text-xs font-semibold tracking-[0.12em] text-[#606553]">CREATE TASK</button>
            <button className="border border-[#cbc4b3] bg-white text-xs font-semibold text-[#606553]">...</button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1 border-y border-[#d8d2c2] bg-[#2f4d43] p-1 text-xs md:grid-cols-7">
          {["Candidates", "Edit", "Scorecards", "Interviews", "Adverts", "Insights", "Share"].map((item, idx) => (
            <div
              key={item}
              className={`rounded px-3 py-2 text-center font-semibold ${idx === 0 ? "bg-white text-[#2f4d43]" : "text-[#cfe0d8]"}`}
            >
              {item}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between border-b border-[#ddd7c6] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a856f]">
          <button className="border border-[#d5cfbe] bg-white px-3 py-2 text-[#6c705f]">Exit Queue</button>
          <button className="px-2 py-1 text-[#8a856f]">Previous</button>
          <div>1 Of 1 Candidates</div>
          <div className="flex items-center gap-2">
            <button className="px-2 py-1 text-[#8a856f]">Next</button>
            <button className="px-2 py-1 text-[#8a856f]">Remove</button>
          </div>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e4ddcc] pb-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-[#f7d59f] text-sm font-bold text-[#2f4d43]">
                {initials(candidate.fullName)}
              </div>
              <div>
                <div className="text-3xl font-semibold text-[#2d3228]">{candidate.fullName}</div>
                <div className="mt-1 text-xs text-[#8a866f]">{candidate.email} - {candidate.phone}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button className="border border-[#cbc4b3] bg-white font-semibold tracking-[0.08em] text-[#5f6553]">MESSAGE</button>
              <button className="border border-[#cbc4b3] bg-white font-semibold tracking-[0.08em] text-[#5f6553]">INTERVIEW</button>
              <button className="border border-[#cbc4b3] bg-white font-semibold tracking-[0.08em] text-[#5f6553]">CREATE TASK</button>
              <button className="border border-[#cbc4b3] bg-white font-semibold text-[#5f6553]">...</button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-[#e4ddcc] pb-4">
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${stageBadge(stageLabel)}`}>{stageLabel}</span>
            <span className="rounded-full bg-[#f1ecde] px-3 py-1 text-xs font-semibold text-[#7f7a62]">Tags {applications.length}</span>
            <span className="rounded-full bg-[#f1ecde] px-3 py-1 text-xs font-semibold text-[#7f7a62]">Other Applications {Math.max(applications.length - 1, 0)}</span>
              <span className="ml-auto text-xs text-[#7f7a62]">
                Applied: {formatDate(selectedApplication?.appliedAtUtc)} - Deadline: {formatDate(selectedApplication?.applicationDeadlineUtc)}
              </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
            <div className="border border-[#ddd7c6] bg-white">
              {detailTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`w-full border-b border-[#ece6d6] px-4 py-3 text-left text-sm ${
                    activeTab === tab
                      ? "bg-[#f7f4ea] font-semibold text-[#2c3128]"
                      : "text-[#6f745f] hover:bg-[#faf7ef]"
                  }`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {activeTab === "Resume" ? (
                <div className="border border-[#ddd7c6] bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ece6d6] px-4 py-3">
                    <h2 className="text-2xl font-semibold text-[#2b2f25]">Resume</h2>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={downloadResume}
                        disabled={!resumeMeta?.id || downloadingResume}
                        className="border border-[#2f4d43] bg-[#2f4d43] px-3 py-2 font-semibold text-white disabled:opacity-60"
                      >
                        {downloadingResume ? "Downloading..." : "Download"}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 p-4">
                    <div className="text-xs text-[#7f7a62]">
                      File: {resumeMeta?.originalFileName ?? "No resume uploaded"} - Uploaded: {formatDateTime(resumeMeta?.createdAtUtc)}
                    </div>

                    {resumeUrl ? (
                      <iframe
                        title="Resume preview"
                        src={resumeUrl}
                        className="h-[680px] w-full border border-[#ddd7c6] bg-white"
                      />
                    ) : (
                      <div className="grid h-[420px] place-items-center border border-dashed border-[#cfc8b5] bg-[#fbf9f2] text-sm text-[#7d7a67]">
                        {previewMessage}
                      </div>
                    )}
                  </div>
                </div>
              ) : activeTab === "Application" ? (
                <div className="border border-[#ddd7c6] bg-white p-4">
                  <h2 className="text-xl font-semibold text-[#2b2f25]">Application Snapshot</h2>
                  <div className="mt-3 grid gap-3 text-sm text-[#545a49] md:grid-cols-2">
                    <div className="rounded border border-[#ece6d6] bg-[#fbf8f0] p-3">
                      <div className="text-xs uppercase tracking-[0.12em] text-[#88836e]">Current Stage</div>
                      <div className="mt-1 font-semibold text-[#2f342a]">{stageLabel}</div>
                    </div>
                    <div className="rounded border border-[#ece6d6] bg-[#fbf8f0] p-3">
                      <div className="text-xs uppercase tracking-[0.12em] text-[#88836e]">Experience</div>
                      <div className="mt-1 font-semibold text-[#2f342a]">{candidate.yearsOfExperience} years</div>
                    </div>
                    <div className="rounded border border-[#ece6d6] bg-[#fbf8f0] p-3">
                      <div className="text-xs uppercase tracking-[0.12em] text-[#88836e]">Applied At</div>
                      <div className="mt-1 font-semibold text-[#2f342a]">{formatDateTime(selectedApplication?.appliedAtUtc)}</div>
                    </div>
                    <div className="rounded border border-[#ece6d6] bg-[#fbf8f0] p-3">
                      <div className="text-xs uppercase tracking-[0.12em] text-[#88836e]">Source</div>
                      <div className="mt-1 font-semibold text-[#2f342a]">{sourceLabel(candidate.source)}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-[#ddd7c6] bg-white p-4 text-sm text-[#6f745f]">
                  {activeTab} section will be populated from workflow data.
                </div>
              )}

              <div className="border border-[#ddd7c6] bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[#2b2f25]">Timeline</h3>
                  <Link href={selectedApplication?.jobId ? `/candidates?jobId=${selectedApplication.jobId}` : "/candidates"} className="text-xs font-semibold text-[#2f4d43] underline">
                    Back To Candidates
                  </Link>
                </div>
                {timeline.length === 0 ? (
                  <div className="text-sm text-[#7f7a67]">No timeline events yet.</div>
                ) : (
                  <div className="space-y-2">
                    {timeline.map((item) => (
                      <div key={item.id} className="rounded border border-[#ece6d6] bg-[#fbf8f0] px-3 py-2 text-sm text-[#4f5545]">
                        <div className="font-semibold">{timelineEventLabel(item.eventType)}</div>
                        <div className="text-xs text-[#817d66]">{formatDateTime(item.createdAtUtc)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
