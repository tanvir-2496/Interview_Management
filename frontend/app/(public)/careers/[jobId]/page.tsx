"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Link from "next/link";
import { defaultCompanyProfile, loadPublicCompanyProfile } from "@/lib/companyProfile";

type Job = {
  id: string;
  title: string;
  department: string;
  skillsCsv: string;
  salaryRangeMin: number;
  salaryRangeMax: number;
  isSalaryNegotiable: boolean;
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
  const [company, setCompany] = useState(defaultCompanyProfile);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.allSettled([api.get(`/api/public/jobs/${params.jobId}`), loadPublicCompanyProfile()]).then((results) => {
      if (results[0].status === "fulfilled") {
        setJob(results[0].value.data);
        setError("");
      } else {
        setError("Job details load korte parini.");
      }
      if (results[1].status === "fulfilled") setCompany(results[1].value);
    });
  }, [params.jobId]);

  const skills = (job?.skillsCsv || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (error) return <div className="rounded-xl bg-white p-6 text-red-600 shadow-sm">{error}</div>;
  if (!job) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-600 p-4 text-white shadow-lg md:p-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2">
              <img src={company.logoUrl || "/NAAS-Logo.png"} alt={`${company.companyName} logo`} width={40} height={40} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{company.companyName}</h1>
              <p className="text-sm text-cyan-50">{job.title}</p>
            </div>
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-[1.1fr_1fr]">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4 flex items-center gap-3">
            <img src={company.logoUrl || "/NAAS-Logo.png"} alt={`${company.companyName} logo`} width={64} height={64} className="rounded-lg ring-1 ring-slate-200" />
            <div>
              <h2 className="text-3xl font-bold text-slate-900">{job.title}</h2>
              <p className="text-sm text-slate-600">{company.companyName} · {job.locationText || company.location}</p>
            </div>
          </div>

          <div className="grid gap-2 text-sm text-slate-700">
            <p><span className="font-semibold">Vacancies:</span> {job.vacancyCount}</p>
            <p><span className="font-semibold">Department:</span> {job.department}</p>
            <p><span className="font-semibold">Job Type:</span> {employmentText(job.employmentType)}</p>
            <p><span className="font-semibold">Salary:</span> {job.isSalaryNegotiable ? "Negotiable" : `${job.salaryRangeMin.toLocaleString()} - ${job.salaryRangeMax.toLocaleString()}`}</p>
            <p><span className="font-semibold">Work Mode:</span> {locationTypeText(job.locationType)}</p>
            <p><span className="font-semibold">Application Deadline:</span> {job.applicationDeadlineUtc ? new Date(job.applicationDeadlineUtc).toLocaleDateString() : "N/A"}</p>
            <p><span className="font-semibold">Office Location:</span> {job.locationText || company.location}</p>
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
            <p className="text-sm leading-7 text-slate-700">{company.description}</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h3 className="mb-3 text-3xl font-bold text-slate-900">Skills</h3>
            {skills.length === 0 ? (
              <p className="text-sm text-slate-500">Not specified.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <span key={s} className="rounded-full bg-cyan-100 px-3 py-1 text-sm font-medium text-cyan-700">
                    {s}
                  </span>
                ))}
              </div>
            )}
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
        <div className="mt-6">
          <Link
            href={`/careers/${params.jobId}/apply`}
            className="inline-block rounded-md bg-cyan-500 px-5 py-2 font-medium text-white transition hover:bg-cyan-600"
          >
            Apply Now
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-3xl font-bold text-slate-900">Life At {company.companyName}</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="h-44 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 p-4 text-white">Leadership & Vision</div>
          <div className="h-44 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 p-4 text-white">Team Culture</div>
          <div className="h-44 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 p-4 text-white">Events & Activities</div>
        </div>
      </section>
    </div>
  );
}
