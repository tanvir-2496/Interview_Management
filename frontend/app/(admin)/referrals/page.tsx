"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";

type JobItem = {
  id: string;
  title: string;
  jobCode: string;
  status: number;
};

type ReferralItem = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  referredByName?: string | null;
  referredByEmail?: string | null;
  referredByEmployeeId?: string | null;
  createdAtUtc: string;
  resumeFileName?: string | null;
  jobId?: string | null;
  jobTitle?: string | null;
};

export default function ReferralsPage() {
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [items, setItems] = useState<ReferralItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [jobSearch, setJobSearch] = useState("");
  const [isJobDropdownOpen, setIsJobDropdownOpen] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    referredByName: "",
    referredByEmail: "",
    referredByEmployeeId: "",
    jobId: ""
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const showToast = (type: "success" | "error", text: string) => setToast({ type, text });

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const load = async () => {
    try {
      const [jobRes, referralRes] = await Promise.all([
        api.get("/api/jobs?page=1&pageSize=200"),
        api.get("/api/candidates/referrals")
      ]);
      setJobs(jobRes.data.items ?? []);
      setItems(referralRes.data ?? []);
    } catch {
      showToast("error", "Failed to load referrals.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const filteredJobs = useMemo(() => {
    const q = jobSearch.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) => (`${j.title} ${j.jobCode}`).toLowerCase().includes(q));
  }, [jobs, jobSearch]);

  const selectedJobLabel = useMemo(() => {
    if (!form.jobId) return "Referral Pool (No Job Selected)";
    const job = jobs.find((j) => j.id === form.jobId);
    return job ? `${job.title} (${job.jobCode})` : "Referral Pool (No Job Selected)";
  }, [form.jobId, jobs]);

  const resetForm = () => {
    setForm({
      fullName: "",
      email: "",
      phone: "",
      referredByName: "",
      referredByEmail: "",
      referredByEmployeeId: "",
      jobId: ""
    });
    setJobSearch("");
    setIsJobDropdownOpen(false);
    setResumeFile(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeFile) {
      showToast("error", "Resume file is required.");
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("fullName", form.fullName);
      fd.append("email", form.email);
      fd.append("phone", form.phone);
      fd.append("referredByName", form.referredByName);
      if (form.referredByEmail.trim()) fd.append("referredByEmail", form.referredByEmail.trim());
      if (form.referredByEmployeeId.trim()) fd.append("referredByEmployeeId", form.referredByEmployeeId.trim());
      if (form.jobId) fd.append("jobId", form.jobId);
      fd.append("resume", resumeFile);

      await api.post("/api/candidates/referrals", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      showToast("success", "Referral entry saved.");
      resetForm();
      await load();
    } catch (e: any) {
      const message =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        (typeof e?.response?.data === "string" ? e.response.data : null) ||
        (e?.response?.status ? `Save failed (${e.response.status})` : "Network error");
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {toast ? (
        <div className="pointer-events-none fixed left-1/2 top-6 z-50 -translate-x-1/2">
          <div className={`rounded-lg px-5 py-3 text-sm font-medium text-white shadow-lg ${toast.type === "success" ? "bg-emerald-600" : "bg-red-600"}`}>
            {toast.text}
          </div>
        </div>
      ) : null}

      <h1 className="text-2xl font-bold">Referrals</h1>

      <form onSubmit={submit} className="rounded border border-[#d6cfbc] bg-white p-4 space-y-3">
        <h2 className="text-lg font-semibold">New Referral Entry</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span>Candidate Name</span>
            <input value={form.fullName} onChange={(e) => onChange("fullName", e.target.value)} required />
          </label>
          <label className="space-y-1 text-sm">
            <span>Candidate Email</span>
            <input type="email" value={form.email} onChange={(e) => onChange("email", e.target.value)} required />
          </label>
          <label className="space-y-1 text-sm">
            <span>Candidate Phone</span>
            <input value={form.phone} onChange={(e) => onChange("phone", e.target.value)} required />
          </label>
          <label className="space-y-1 text-sm">
            <span>Referred By (Employee Name)</span>
            <input value={form.referredByName} onChange={(e) => onChange("referredByName", e.target.value)} required />
          </label>
          <label className="space-y-1 text-sm">
            <span>Referrer Email (Optional)</span>
            <input type="email" value={form.referredByEmail} onChange={(e) => onChange("referredByEmail", e.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <span>Referrer Employee ID (Optional)</span>
            <input value={form.referredByEmployeeId} onChange={(e) => onChange("referredByEmployeeId", e.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <span>Assign Job (Optional)</span>
            <div className="relative">
              <input
                value={jobSearch}
                placeholder={selectedJobLabel}
                onFocus={() => setIsJobDropdownOpen(true)}
                onBlur={() => window.setTimeout(() => setIsJobDropdownOpen(false), 150)}
                onChange={(e) => {
                  setJobSearch(e.target.value);
                  onChange("jobId", "");
                  setIsJobDropdownOpen(true);
                }}
              />
              {isJobDropdownOpen ? (
                <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-300 bg-white shadow">
                  <button
                    type="button"
                    className="w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50"
                    onClick={() => {
                      onChange("jobId", "");
                      setJobSearch("");
                      setIsJobDropdownOpen(false);
                    }}
                  >
                    Referral Pool (No Job Selected)
                  </button>
                  {filteredJobs.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-500">No matching jobs.</div>
                  ) : filteredJobs.map((j) => (
                    <button
                      key={j.id}
                      type="button"
                      className="w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50"
                      onClick={() => {
                        onChange("jobId", j.id);
                        setJobSearch(`${j.title} (${j.jobCode})`);
                        setIsJobDropdownOpen(false);
                      }}
                    >
                      {j.title} ({j.jobCode})
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="text-xs text-slate-500">Selected: {selectedJobLabel}</div>
          </label>
          <label className="space-y-1 text-sm">
            <span>Resume / CV</span>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
              required
            />
          </label>
        </div>
        <button className="bg-[#244439] text-white" type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Referral"}
        </button>
      </form>

      <section className="rounded border border-[#d6cfbc] bg-white">
        <div className="border-b border-[#ece6d5] px-4 py-3 text-sm font-semibold">Referral Entries</div>
        {items.length === 0 ? <div className="px-4 py-6 text-sm text-slate-500">No referrals yet.</div> : null}

        <div className="divide-y divide-[#f0ebdd]">
          {items.map((r) => (
            <div key={r.id} className="grid gap-2 px-4 py-3 md:grid-cols-[1.1fr_1.2fr_0.9fr_0.8fr_0.9fr]">
              <div>
                <div className="text-sm font-semibold">{r.fullName}</div>
                <div className="text-xs text-slate-600">{r.email}</div>
                <div className="text-xs text-slate-600">{r.phone}</div>
              </div>
              <div>
                <div className="text-sm font-semibold">Referred By</div>
                <div className="text-xs text-slate-700">{r.referredByName || "-"}</div>
                <div className="text-xs text-slate-600">{r.referredByEmail || "-"}</div>
                <div className="text-xs text-slate-600">ID: {r.referredByEmployeeId || "-"}</div>
              </div>
              <div>
                <div className="text-sm font-semibold">Job</div>
                <div className="text-xs text-slate-700">{r.jobTitle || "Referral Pool"}</div>
              </div>
              <div>
                <div className="text-sm font-semibold">CV</div>
                <div className="text-xs text-slate-700">{r.resumeFileName || "-"}</div>
              </div>
              <div>
                <div className="text-sm font-semibold">Date</div>
                <div className="text-xs text-slate-700">{new Date(r.createdAtUtc).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
