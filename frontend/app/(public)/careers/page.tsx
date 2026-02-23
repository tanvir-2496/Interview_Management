"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Link from "next/link";
import Image from "next/image";

type Job = {
  id: string;
  title: string;
  department: string;
  locationText: string;
  vacancyCount: number;
  employmentType: number;
  applicationDeadlineUtc?: string | null;
};

function employmentTypeText(v: number) {
  if (v === 1) return "Permanent";
  if (v === 3) return "Contractual";
  if (v === 4) return "Intern";
  if (v === 2) return "Part Time";
  return "Permanent";
}

export default function CareersPage() {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    api.get("/api/public/jobs").then((r) => setJobs(r.data));
  }, []);

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-500 p-4 text-white shadow-lg">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2">
              <Image src="/NAAS-Logo.png" alt="NAAS Logo" width={36} height={36} />
            </div>
            <h1 className="text-2xl font-bold md:text-4xl">NAAS Solutions Limited</h1>
          </Link>
        </div>

        <div className="relative">
          <div
            className="h-[260px] rounded-2xl bg-cover bg-center shadow-lg md:h-[420px]"
            style={{ backgroundImage: "url('/naas-poster.png')" }}
          />

          <div className="mx-3 -mt-8 rounded-2xl bg-white p-5 shadow-lg ring-1 ring-slate-200 md:mx-8 md:-mt-12 md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Image src="/NAAS-Logo.png" alt="NAAS Logo" width={64} height={64} className="rounded-lg ring-1 ring-slate-200" />
                <div>
                  <h2 className="text-3xl font-bold text-slate-900">NAAS Solutions Limited</h2>
                  <p className="text-sm text-slate-600">Dhaka, Bangladesh</p>
                </div>
              </div>
              <a
                href="https://naasbd.com/"
                target="_blank"
                rel="noreferrer"
                className="rounded-md bg-cyan-500 px-5 py-2 font-medium text-white transition hover:bg-cyan-600"
              >
                Explore Company Website
              </a>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-700">
              NAAS have started our journey in ICT business with mobile content in 2006. Since then it has been
              operating in content industry with excellent reputation and become the biggest mobile phone Content
              Provider in the country. We provide mobile Value Added Services (VAS) for Channel-i and ATN Bangla
              television channels, leading newspapers like the Prothom Alo and The Daily Star and popular radio
              channels like ABC Radio and Radio Amaar. We have launched a Mobile TV service for the first time in
              Bangladesh and introduced e-commerce sites with Channel-i and ATN Bangla. We have also provided
              customized mobile phone based tracking applications to organizations like FAO (Food and Agriculture
              Organization of the United Nations) and Group4securicor (G4S). In fact, Group4Securicor is using our
              mobile application GMAS for security purposes of Standard Chartered Bank.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-[2fr_1fr]">
        <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-6 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,.35),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(56,189,248,.25),transparent_45%)]" />
          <div className="relative space-y-3">
            <h2 className="text-2xl font-semibold">Join NAAS Solutions Team</h2>
            <p className="max-w-2xl text-sm text-slate-200">
              We design and deliver secure, scalable digital products for regional and global clients.
              Explore open positions and apply directly from this portal.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white/15 px-3 py-1">Dhaka, Bangladesh</span>
              <span className="rounded-full bg-white/15 px-3 py-1">Physical Office</span>
              <span className="rounded-full bg-white/15 px-3 py-1">Product + Services</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">Contact Us</h3>
          <div className="space-y-3 text-sm text-slate-100">
            <p>
              <span className="mr-2">📍</span>
              H#3 (4th Floor), R#3, Block #B, Rampura, Banasree, Dhaka.
            </p>
            <p>
              <span className="mr-2">✉️</span>
              info@naasbd.com
            </p>
            <p>
              <span className="mr-2">📞</span>
              +880 1841-428736
            </p>
            <a className="inline-block text-cyan-300 underline" href="https://naasbd.com/" target="_blank" rel="noreferrer">
              https://naasbd.com/
            </a>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-3xl font-bold text-slate-900">Open Job Positions</h2>
        {jobs.length === 0 ? (
          <div className="rounded-xl bg-white p-6 text-slate-600 shadow-sm ring-1 ring-slate-200">
            No active jobs are published yet.
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((j) => (
              <div key={j.id} className="grid items-center gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 md:grid-cols-[2fr_1fr_auto]">
                <div>
                  <Link href={`/careers/${j.id}`} className="block">
                    <h3 className="text-2xl font-semibold text-slate-900 hover:text-cyan-600">{j.title}</h3>
                  </Link>
                  <p className="mt-1 text-sm text-slate-600">
                    NAAS Solutions Limited · {j.locationText || "Dhaka, Bangladesh"}
                  </p>
                </div>
                <div className="text-sm text-slate-600">
                  <p className="font-semibold">Deadline: {j.applicationDeadlineUtc ? new Date(j.applicationDeadlineUtc).toLocaleDateString() : "N/A"}</p>
                  <p>Vacancies: {j.vacancyCount}</p>
                </div>
                <Link
                  className="rounded-md bg-cyan-500 px-5 py-2 font-medium text-white transition hover:bg-cyan-600"
                  href={`/careers/${j.id}/apply`}
                >
                  Apply Now
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-3xl font-bold text-slate-900">Life At NAAS</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="h-44 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 p-4 text-white">Engineering Culture</div>
          <div className="h-44 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 p-4 text-white">Team Collaboration</div>
          <div className="h-44 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 p-4 text-white">Growth & Learning</div>
        </div>
      </section>
    </div>
  );
}
