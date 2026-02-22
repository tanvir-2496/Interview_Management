"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import Link from "next/link";
import Image from "next/image";

type Job = {
  id: string;
  title: string;
  department: string;
  locationText: string;
  employmentType: number;
  locationType: number;
  vacancyCount: number;
  applicationDeadlineUtc?: string | null;
  descriptionHtml: string;
  requirementsHtml: string;
};

function employmentText(v: number) {
  if (v === 1) return "Permanent";
  if (v === 2) return "Part Time";
  if (v === 3) return "Contractual";
  if (v === 4) return "Internship";
  return "Permanent";
}

function locationTypeText(v: number) {
  if (v === 1) return "Remote";
  if (v === 2) return "On-site";
  if (v === 3) return "Hybrid";
  return "On-site";
}

export default function CareerDetailPage({ params }: { params: { jobId: string } }) {
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/api/public/jobs/${params.jobId}`)
      .then((r) => {
        setJob(r.data);
        setError("");
      })
      .catch(() => setError("Job details load করা যায়নি।"));
  }, [params.jobId]);

  const skills = useMemo(() => {
    if (!job?.title) return ["Problem Solving", "Communication"];
    const base = ["Team Collaboration", "Problem Solving"];
    if (job.title.toLowerCase().includes("flutter")) return ["Flutter", "Dart", "REST API", ...base];
    if (job.title.toLowerCase().includes("manager")) return ["Leadership", "Stakeholder Management", ...base];
    if (job.title.toLowerCase().includes("front")) return ["JavaScript", "React", "UI/UX", ...base];
    return ["Domain Knowledge", ...base];
  }, [job]);

  if (error) return <div className="rounded-xl bg-white p-6 text-red-600 shadow-sm">{error}</div>;
  if (!job) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-600 p-4 text-white shadow-lg md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2">
              <Image src="/naas-logo.png" alt="NAAS Logo" width={40} height={40} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">NAAS Solutions Limited</h1>
              <p className="text-sm text-cyan-50">{job.title}</p>
            </div>
          </div>
          <Link
            href={`/careers/${params.jobId}/apply`}
            className="rounded-md bg-white px-5 py-2 text-sm font-semibold text-cyan-700 transition hover:bg-slate-100"
          >
            Apply Now
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-[1.1fr_1fr]">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4 flex items-center gap-3">
            <Image src="/naas-logo.png" alt="NAAS Logo" width={64} height={64} className="rounded-lg ring-1 ring-slate-200" />
            <div>
              <h2 className="text-3xl font-bold text-slate-900">{job.title}</h2>
              <p className="text-sm text-slate-600">NAAS Solutions Limited · {job.locationText || "Dhaka, Bangladesh"}</p>
            </div>
          </div>

          <div className="grid gap-2 text-sm text-slate-700">
            <p><span className="font-semibold">Vacancies:</span> {job.vacancyCount}</p>
            <p><span className="font-semibold">Department:</span> {job.department}</p>
            <p><span className="font-semibold">Job Type:</span> {employmentText(job.employmentType)}</p>
            <p><span className="font-semibold">Work Mode:</span> {locationTypeText(job.locationType)}</p>
            <p><span className="font-semibold">Application Deadline:</span> {job.applicationDeadlineUtc ? new Date(job.applicationDeadlineUtc).toLocaleDateString() : "N/A"}</p>
            <p><span className="font-semibold">Office Location:</span> {job.locationText || "Dhaka, Bangladesh"}</p>
          </div>

          <div className="mt-5">
            <Link
              href={`/careers/${params.jobId}/apply`}
              className="inline-block rounded-md bg-cyan-500 px-5 py-2 font-medium text-white transition hover:bg-cyan-600"
            >
              Apply Now
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h3 className="mb-2 text-3xl font-bold text-slate-900">Company Description</h3>
            <p className="text-sm leading-7 text-slate-700">
              NAAS Solutions Limited is a technology-driven company focused on secure and scalable software
              products. We work with modern engineering practices and client-centric delivery to build meaningful
              digital solutions for local and global markets.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h3 className="mb-3 text-3xl font-bold text-slate-900">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <span key={s} className="rounded-full bg-cyan-100 px-3 py-1 text-sm font-medium text-cyan-700">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h3 className="mb-4 text-3xl font-bold text-slate-900">Description</h3>
        <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: job.descriptionHtml }} />
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h3 className="mb-4 text-3xl font-bold text-slate-900">Job Responsibilities</h3>
        <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: job.requirementsHtml }} />
      </section>

      <section className="space-y-3">
        <h3 className="text-3xl font-bold text-slate-900">Life At NAAS Solutions Limited</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="h-44 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 p-4 text-white">Leadership & Vision</div>
          <div className="h-44 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 p-4 text-white">Team Culture</div>
          <div className="h-44 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 p-4 text-white">Events & Activities</div>
        </div>
      </section>
    </div>
  );
}
