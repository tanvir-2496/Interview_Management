"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import api from "@/lib/api";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email(),
  phone: z.string().min(6),
  source: z.string().default("Portal"),
  personalSummary: z.string().optional(),
  isBangladeshi: z.enum(["yes", "no"], { required_error: "Please select citizenship" }),
  degreeProgram: z.string().min(1, "Please select your degree program"),
  passingYear: z.string().min(1, "Please select passing year"),
  interviewedBefore: z.enum(["yes", "no"], { required_error: "Please select interview history" }),
  experienceRange: z.string().min(1, "Please select experience"),
  consent: z.boolean().refine((v) => v, "You must allow processing your personal information")
});

export default function ApplyPage({ params }: { params: { jobId: string } }) {
  const [jobTitle, setJobTitle] = useState("Apply");
  const currentYear = new Date().getFullYear();
  const passingYearOptions = [
    "Currently pursuing",
    ...Array.from({ length: currentYear - 2010 }, (_, i) => String(currentYear - i)),
    "2010 or earlier"
  ];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      source: "Portal",
      consent: false
    }
  });
  const [popup, setPopup] = useState<{ open: boolean; type: "success" | "error"; message: string }>({
    open: false,
    type: "success",
    message: ""
  });
  const [passingYearOpen, setPassingYearOpen] = useState(false);
  const passingYearRef = useRef<HTMLDivElement | null>(null);
  const selectedPassingYear = watch("passingYear");

  const showPopup = (type: "success" | "error", message: string) => {
    setPopup({ open: true, type, message });
    setTimeout(() => setPopup((prev) => ({ ...prev, open: false })), 2400);
  };

  useEffect(() => {
    api.get(`/api/public/jobs/${params.jobId}`)
      .then((r) => setJobTitle(r.data?.title || "Apply"))
      .catch(() => setJobTitle("Apply"));
  }, [params.jobId]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!passingYearRef.current) return;
      if (!passingYearRef.current.contains(e.target as Node)) {
        setPassingYearOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    const file = (document.getElementById("resume") as HTMLInputElement)?.files?.[0];
    if (!file) {
      showPopup("error", "Resume / CV is required.");
      return;
    }

    const form = new FormData();
    form.append("fullName", `${values.firstName} ${values.lastName}`.trim());
    form.append("email", values.email);
    form.append("phone", values.phone);
    form.append("source", values.source);
    form.append("firstName", values.firstName);
    form.append("lastName", values.lastName);
    form.append("personalSummary", values.personalSummary ?? "");
    form.append("isBangladeshi", values.isBangladeshi);
    form.append("degreeProgram", values.degreeProgram);
    form.append("passingYear", values.passingYear);
    form.append("interviewedBefore", values.interviewedBefore);
    form.append("experienceRange", values.experienceRange);
    form.append("consent", String(values.consent));
    form.append("resume", file);

    try {
      await api.post(`/api/public/jobs/${params.jobId}/apply`, form, { headers: { "Content-Type": "multipart/form-data" } });
      reset({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        source: "Portal",
        personalSummary: "",
        degreeProgram: "",
        passingYear: "",
        experienceRange: "",
        consent: false
      });
      const resumeInput = document.getElementById("resume") as HTMLInputElement | null;
      if (resumeInput) resumeInput.value = "";
      showPopup("success", "Application submitted successfully.");
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.detail ||
        (e?.response?.status ? `Submit failed (${e.response.status})` : "Network error");
      showPopup("error", msg);
    }
  });

  return (
    <div className="space-y-6">
      {popup.open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className={`w-full max-w-md rounded-xl px-5 py-4 text-center text-sm font-semibold shadow-lg ${popup.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
            {popup.message}
          </div>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-500 p-4 text-white shadow-lg">
        <Link href="/" className="inline-flex items-center gap-3">
          <div className="rounded-xl bg-white/20 p-2">
            <Image src="/NAAS-Logo.png" alt="NAAS Logo" width={36} height={36} />
          </div>
          <div>
            <h1 className="text-2xl font-bold md:text-4xl">NAAS Solutions Limited</h1>
            <p className="text-sm text-cyan-50">{jobTitle}</p>
          </div>
        </Link>
      </section>

      <form className="mx-auto max-w-5xl space-y-10 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200" onSubmit={onSubmit}>
        <section className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-3xl font-bold text-slate-900"><span className="mr-2 text-sky-600">1.</span> Personal Details</h2>
          </div>
          <p className="text-sm text-slate-600">We&apos;ll need these details in order to be able to contact you.</p>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">First Name <span className="text-red-500">*</span></label>
            <input className="py-3" placeholder="First name" {...register("firstName")} />
            {errors.firstName ? <p className="text-xs text-red-600">{errors.firstName.message}</p> : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Last Name <span className="text-red-500">*</span></label>
            <input className="py-3" placeholder="Last name" {...register("lastName")} />
            {errors.lastName ? <p className="text-xs text-red-600">{errors.lastName.message}</p> : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Email Address <span className="text-red-500">*</span></label>
            <input className="py-3" placeholder="email@address.com" {...register("email")} />
            {errors.email ? <p className="text-xs text-red-600">{errors.email.message}</p> : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Phone <span className="text-red-500">*</span></label>
            <input className="py-3" placeholder="Phone" {...register("phone")} />
            {errors.phone ? <p className="text-xs text-red-600">{errors.phone.message}</p> : null}
          </div>
        </section>

        <section className="space-y-5">
          <h2 className="text-3xl font-bold text-slate-900"><span className="mr-2 text-sky-600">2.</span> Profile</h2>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Resume / CV <span className="text-red-500">*</span></label>
            <p className="text-xs text-slate-500">Accepted file formats are .pdf and .docx</p>
            <input className="py-3" id="resume" type="file" accept=".pdf,.doc,.docx" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Personal Summary</label>
            <p className="text-xs text-slate-500">This section is optional. Use it to tell us a little more about yourself.</p>
            <textarea className="py-3" rows={6} {...register("personalSummary")} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Application Source</label>
            <select className="py-3" {...register("source")}>
              <option>Portal</option>
              <option>LinkedIn</option>
              <option>Facebook</option>
              <option>Referral</option>
              <option>WhatsApp</option>
              <option>Other</option>
            </select>
          </div>
        </section>

        <section className="space-y-5">
          <h2 className="text-3xl font-bold text-slate-900"><span className="mr-2 text-sky-600">3.</span> Questions</h2>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Are you a Bangladeshi citizen? <span className="text-red-500">*</span></label>
            <div className="space-y-3">
              <label className="flex cursor-pointer items-center gap-2 rounded border border-slate-300 px-3 py-3">
                <input className="h-4 w-4 !w-4 !px-0 !py-0" type="radio" value="yes" {...register("isBangladeshi")} />
                <span>Yes</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded border border-slate-300 px-3 py-3">
                <input className="h-4 w-4 !w-4 !px-0 !py-0" type="radio" value="no" {...register("isBangladeshi")} />
                <span>No</span>
              </label>
            </div>
            {errors.isBangladeshi ? <p className="text-xs text-red-600">{errors.isBangladeshi.message}</p> : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Which undergraduate (or equivalent) program have you completed or are currently pursuing? <span className="text-red-500">*</span></label>
            <select className="py-3" {...register("degreeProgram")}>
              <option value="">Select...</option>
              <option value="cse">Computer Science / CSE</option>
              <option value="eee">EEE</option>
              <option value="bba">BBA / Business</option>
              <option value="other">Other</option>
            </select>
            {errors.degreeProgram ? <p className="text-xs text-red-600">{errors.degreeProgram.message}</p> : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Please select the passing year of your undergraduate degree. <span className="text-red-500">*</span></label>
            <input type="hidden" {...register("passingYear")} />
            <div className="relative" ref={passingYearRef}>
              <button
                type="button"
                onClick={() => setPassingYearOpen((v) => !v)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-left text-slate-700 shadow-sm transition hover:border-slate-400 focus:border-sky-500 focus:outline-none focus:shadow focus:shadow-sky-100"
              >
                {selectedPassingYear || "Select..."}
              </button>
              {passingYearOpen ? (
                <div className="absolute top-full z-30 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-300 bg-white shadow-lg">
                  {passingYearOptions.map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => {
                        setValue("passingYear", y, { shouldValidate: true });
                        setPassingYearOpen(false);
                      }}
                      className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                    >
                      {y}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            {errors.passingYear ? <p className="text-xs text-red-600">{errors.passingYear.message}</p> : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Have you interviewed with NAAS Solutions before? <span className="text-red-500">*</span></label>
            <div className="space-y-3">
              <label className="flex cursor-pointer items-center gap-2 rounded border border-slate-300 px-3 py-3">
                <input className="h-4 w-4 !w-4 !px-0 !py-0" type="radio" value="yes" {...register("interviewedBefore")} />
                <span>Yes</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded border border-slate-300 px-3 py-3">
                <input className="h-4 w-4 !w-4 !px-0 !py-0" type="radio" value="no" {...register("interviewedBefore")} />
                <span>No</span>
              </label>
            </div>
            {errors.interviewedBefore ? <p className="text-xs text-red-600">{errors.interviewedBefore.message}</p> : null}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">How many years of experience do you have in the relevant field? <span className="text-red-500">*</span></label>
            <select className="py-3" {...register("experienceRange")}>
              <option value="">Select...</option>
              <option value="0-1">0-1 years</option>
              <option value="2-3">2-3 years</option>
              <option value="4-6">4-6 years</option>
              <option value="7+">7+ years</option>
            </select>
            {errors.experienceRange ? <p className="text-xs text-red-600">{errors.experienceRange.message}</p> : null}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-3xl font-bold text-slate-900"><span className="mr-2 text-sky-600">4.</span> Submit Application</h2>
          <p className="text-sm text-slate-600">In order to contact you with future jobs that you may be interested in, we need to store your personal data.</p>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input className="h-4 w-4 !w-4 !px-0 !py-0" type="checkbox" {...register("consent")} />
            <span>Allow us to process your personal information.</span>
          </label>
          {errors.consent ? <p className="text-xs text-red-600">{errors.consent.message}</p> : null}

          <button className="w-full rounded-md bg-sky-600 py-3 text-base font-semibold text-white hover:bg-sky-700" type="submit">
            Submit Application
          </button>
        </section>
      </form>
    </div>
  );
}
