"use client";

import { useForm } from "react-hook-form";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import RichEditor from "@/components/RichEditor";
import { useState } from "react";

export default function NewJobPage() {
  const { register, handleSubmit } = useForm<any>({
    defaultValues: {
      locationType: 2,
      employmentType: 1,
      experienceLevel: 2,
      vacancyCount: 1
    }
  });
  const [descriptionHtml, setDescriptionHtml] = useState("<p>Job description</p>");
  const [requirementsHtml, setRequirementsHtml] = useState("<p>Requirements</p>");
  const [error, setError] = useState("");
  const router = useRouter();

  const onSubmit = handleSubmit(async (v) => {
    setError("");
    try {
      const payload = {
        ...v,
        locationType: Number(v.locationType),
        employmentType: Number(v.employmentType),
        experienceLevel: Number(v.experienceLevel),
        applicationDeadlineUtc: v.applicationDeadlineUtc ? new Date(v.applicationDeadlineUtc).toISOString() : null,
        descriptionHtml,
        requirementsHtml,
        descriptionJson: "{}",
        requirementsJson: "{}"
      };
      const res = await api.post("/api/jobs", payload);
      router.push(`/jobs/${res.data.id}`);
    } catch (e: any) {
      const message =
        e?.response?.data?.detail ||
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
        <input placeholder="Title" {...register("title")} />
        <input placeholder="Department" {...register("department")} />
        <input placeholder="Job Code" {...register("jobCode")} />
        <input placeholder="Location" {...register("locationText")} />
        <select {...register("employmentType")}>
          <option value={1}>Permanent</option>
          <option value={3}>Contractual</option>
          <option value={4}>Intern</option>
          <option value={2}>Part Time</option>
        </select>
        <input type="date" {...register("applicationDeadlineUtc")} />
        <select {...register("locationType")}>
          <option value={2}>Physical Office</option>
          <option value={3}>Hybrid</option>
          <option value={1}>Remote</option>
        </select>
        <select {...register("experienceLevel")}>
          <option value={1}>Junior</option>
          <option value={2}>Mid</option>
          <option value={3}>Senior</option>
          <option value={4}>Lead</option>
        </select>
        <input type="number" placeholder="Salary Min" {...register("salaryRangeMin", { valueAsNumber: true })} />
        <input type="number" placeholder="Salary Max" {...register("salaryRangeMax", { valueAsNumber: true })} />
        <input type="number" placeholder="Vacancy" {...register("vacancyCount", { valueAsNumber: true })} />
      </div>
      <div><div>Description</div><RichEditor value={descriptionHtml} onChange={setDescriptionHtml} /></div>
      <div><div>Requirements</div><RichEditor value={requirementsHtml} onChange={setRequirementsHtml} /></div>
      <button className="bg-brand-500 text-white" type="submit">Save</button>
    </form>
  );
}
