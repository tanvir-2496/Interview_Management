"use client";

import { useForm } from "react-hook-form";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import RichEditor from "@/components/RichEditor";
import { useState } from "react";

export default function NewJobPage() {
  const { register, handleSubmit, watch } = useForm<any>({
    defaultValues: {
      locationType: 2,
      employmentType: 1,
      experienceLevel: 2,
      vacancyCount: 1,
      isSalaryNegotiable: false
    }
  });
  const isSalaryNegotiable = watch("isSalaryNegotiable");
  const [descriptionHtml, setDescriptionHtml] = useState("<p>Job description</p>");
  const [requirementsHtml, setRequirementsHtml] = useState("<p>Requirements</p>");
  const [error, setError] = useState("");
  const router = useRouter();

  const onSubmit = handleSubmit(async (v) => {
    setError("");
    try {
      const isNegotiable = !!v.isSalaryNegotiable;
      const salaryMin = isNegotiable ? 0 : Number(v.salaryRangeMin);
      const salaryMax = isNegotiable ? 0 : Number(v.salaryRangeMax);
      if (!isNegotiable) {
        if (!Number.isFinite(salaryMin) || !Number.isFinite(salaryMax)) {
          setError("Salary Min and Salary Max must be valid numbers.");
          return;
        }
        if (salaryMax < salaryMin) {
          setError("Salary Max must be greater than or equal to Salary Min.");
          return;
        }
      }

      const payload = {
        ...v,
        isSalaryNegotiable: isNegotiable,
        locationType: Number(v.locationType),
        employmentType: Number(v.employmentType),
        experienceLevel: Number(v.experienceLevel),
        salaryRangeMin: salaryMin,
        salaryRangeMax: salaryMax,
        applicationDeadlineUtc: v.applicationDeadlineUtc ? new Date(v.applicationDeadlineUtc).toISOString() : null,
        descriptionHtml,
        requirementsHtml,
        descriptionJson: "{}",
        requirementsJson: "{}"
      };
      const res = await api.post("/api/jobs", payload);
      router.push(`/jobs/${res.data.id}`);
    } catch (e: any) {
      const validationErrors = e?.response?.data?.errors;
      if (validationErrors && typeof validationErrors === "object") {
        const firstKey = Object.keys(validationErrors)[0];
        const firstMessage = firstKey ? validationErrors[firstKey]?.[0] : null;
        if (firstMessage) {
          setError(firstMessage);
          return;
        }
      }
      const message =
        e?.response?.data?.detail ||
        e?.response?.data?.title ||
        e?.response?.data?.message ||
        (e?.response?.status ? `Save failed (${e.response.status})` : "Network error");
      setError(message);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <h1 className="text-2xl font-bold">Create Job</h1>
      {error ? <div className="card text-red-600">{error}</div> : null}
      <div className="grid md:grid-cols-2 gap-3">
        <label className="space-y-1 text-sm font-medium">
          <span>Job Title</span>
          <input placeholder="Senior Flutter Developer" {...register("title")} />
        </label>
        <label className="space-y-1 text-sm font-medium">
          <span>Department</span>
          <input placeholder="IT" {...register("department")} />
        </label>
        <label className="space-y-1 text-sm font-medium md:col-span-2">
          <span>Skills (Comma Separated)</span>
          <input placeholder="C#, .Net, Next.Js, Java, PHP, Python, JavaScript" {...register("skillsCsv")} />
        </label>
        <label className="space-y-1 text-sm font-medium">
          <span>Job Code</span>
          <input placeholder="J343" {...register("jobCode")} />
        </label>
        <label className="space-y-1 text-sm font-medium">
          <span>Location</span>
          <input placeholder="Dhaka, Bangladesh" {...register("locationText")} />
        </label>
        <label className="space-y-1 text-sm font-medium">
          <span>Employment Type</span>
          <select {...register("employmentType")}>
            <option value={1}>Permanent</option>
            <option value={3}>Contractual</option>
            <option value={4}>Intern</option>
            <option value={2}>Part Time</option>
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium">
          <span>Application Deadline</span>
          <input type="date" {...register("applicationDeadlineUtc")} />
        </label>
        <label className="space-y-1 text-sm font-medium">
          <span>Location Type</span>
          <select {...register("locationType")}>
            <option value={2}>Physical Office</option>
            <option value={3}>Hybrid</option>
            <option value={1}>Remote</option>
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium">
          <span>Experience Level</span>
          <select {...register("experienceLevel")}>
            <option value={1}>Junior</option>
            <option value={2}>Mid</option>
            <option value={3}>Senior</option>
            <option value={4}>Lead</option>
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium">
          <span>Salary Min</span>
          <input type="number" min={0} placeholder="10" disabled={isSalaryNegotiable} {...register("salaryRangeMin", { valueAsNumber: true })} />
        </label>
        <label className="space-y-1 text-sm font-medium">
          <span>Salary Max</span>
          <input type="number" min={0} placeholder="15" disabled={isSalaryNegotiable} {...register("salaryRangeMax", { valueAsNumber: true })} />
        </label>
        <label className="flex items-center gap-2 text-sm font-medium md:col-span-2">
          <input className="h-4 w-4 !w-4 !px-0 !py-0" type="checkbox" {...register("isSalaryNegotiable")} />
          <span>Salary Negotiable</span>
        </label>
        <label className="space-y-1 text-sm font-medium md:col-span-2">
          <span>Vacancy Count</span>
          <input type="number" placeholder="2" {...register("vacancyCount", { valueAsNumber: true })} />
        </label>
      </div>
      <div><div>Description</div><RichEditor value={descriptionHtml} onChange={setDescriptionHtml} /></div>
      <div><div>Requirements</div><RichEditor value={requirementsHtml} onChange={setRequirementsHtml} /></div>
      <button className="bg-brand-500 text-white" type="submit">Save</button>
    </form>
  );
}
