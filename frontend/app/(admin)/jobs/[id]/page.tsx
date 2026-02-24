"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useForm } from "react-hook-form";

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const [job, setJob] = useState<any>();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const { register, handleSubmit, reset, watch } = useForm<any>();
  const isSalaryNegotiable = watch("isSalaryNegotiable");

  const load = async () => {
    const r = await api.get(`/api/jobs/${params.id}`);
    setJob(r.data);
    reset({
      ...r.data,
      applicationDeadlineUtc: r.data.applicationDeadlineUtc ? new Date(r.data.applicationDeadlineUtc).toISOString().slice(0, 10) : ""
    });
  };

  useEffect(() => { load(); }, [params.id]);

  const action = async (path: string, body = {}) => {
    setError("");
    setMessage("");
    try {
      await api.post(`/api/jobs/${params.id}/${path}`, body);
      await load();
      setMessage("Action completed.");
    } catch (e: any) {
      const m = e?.response?.data?.detail || e?.response?.data?.message || (e?.response?.status ? `Action failed (${e.response.status})` : "Network error");
      setError(m);
    }
  };

  const onSave = handleSubmit(async (v) => {
    setError("");
    setMessage("");
    try {
      const isNegotiable = !!v.isSalaryNegotiable;
      const salaryMin = isNegotiable ? 0 : Number(v.salaryRangeMin);
      const salaryMax = isNegotiable ? 0 : Number(v.salaryRangeMax);
      if (!isNegotiable && salaryMax < salaryMin) {
        setError("Salary Max must be greater than or equal to Salary Min.");
        return;
      }
      const payload = {
        ...v,
        isSalaryNegotiable: isNegotiable,
        locationType: Number(v.locationType),
        employmentType: Number(v.employmentType),
        experienceLevel: Number(v.experienceLevel),
        salaryRangeMin: salaryMin,
        salaryRangeMax: salaryMax,
        vacancyCount: Number(v.vacancyCount),
        applicationDeadlineUtc: v.applicationDeadlineUtc ? new Date(v.applicationDeadlineUtc).toISOString() : null
      };
      await api.put(`/api/jobs/${params.id}`, payload);
      await load();
      setMessage("Job updated.");
    } catch (e: any) {
      const m = e?.response?.data?.detail || e?.response?.data?.message || (e?.response?.status ? `Save failed (${e.response.status})` : "Network error");
      setError(m);
    }
  });

  if (!job) return <div>Loading...</div>;

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Edit Job</h1>
      <div className="card">Status: {job.status}</div>
      {error ? <div className="card text-red-600">{error}</div> : null}
      {message ? <div className="card text-emerald-700">{message}</div> : null}

      <form className="grid gap-3 md:grid-cols-2" onSubmit={onSave}>
        <input placeholder="Title" {...register("title")} />
        <input placeholder="Department" {...register("department")} />
        <input className="md:col-span-2" placeholder="Skills (comma separated): C#, .Net, Next.Js, Java" {...register("skillsCsv")} />
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
        <input type="number" placeholder="Salary Min" disabled={isSalaryNegotiable} {...register("salaryRangeMin")} />
        <input type="number" placeholder="Salary Max" disabled={isSalaryNegotiable} {...register("salaryRangeMax")} />
        <label className="flex items-center gap-2 text-sm">
          <input className="h-4 w-4 !w-4 !px-0 !py-0" type="checkbox" {...register("isSalaryNegotiable")} />
          <span>Salary Negotiable</span>
        </label>
        <input type="number" placeholder="Vacancy" {...register("vacancyCount")} />
        <div className="md:col-span-2">
          <textarea placeholder="Description HTML" rows={5} {...register("descriptionHtml")} />
        </div>
        <div className="md:col-span-2">
          <textarea placeholder="Requirements HTML" rows={5} {...register("requirementsHtml")} />
        </div>
        <input type="hidden" {...register("descriptionJson")} />
        <input type="hidden" {...register("requirementsJson")} />
        <button className="bg-brand-500 text-white" type="submit">Save Changes</button>
      </form>

      <div className="flex gap-2 flex-wrap">
        <button className="bg-brand-500 text-white" onClick={() => action("submit-for-approval")}>Submit For Approval</button>
        <button className="bg-red-600 text-white" onClick={() => action("close")}>Close</button>
      </div>
    </div>
  );
}
