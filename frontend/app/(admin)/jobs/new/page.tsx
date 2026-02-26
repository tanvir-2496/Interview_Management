"use client";

import { useForm } from "react-hook-form";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import RichEditor from "@/components/RichEditor";
import { useEffect, useState } from "react";

const GLOBAL_STAGE_JOB_ID = "00000000-0000-0000-0000-000000000000";

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
  const [availableStages, setAvailableStages] = useState<string[]>([]);
  const [stageRows, setStageRows] = useState<string[]>([]);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    api.get("/api/settings/stages", { params: { jobId: GLOBAL_STAGE_JOB_ID } })
      .then((r) => {
        const items = (r.data ?? []) as Array<{ isActive?: boolean; stageOrder?: number; stageName?: string }>;
        const names: string[] = Array.from(
          new Set(
            items
              .filter((x) => x?.isActive)
              .sort((a, b) => (a?.stageOrder ?? 0) - (b?.stageOrder ?? 0))
              .map((x) => String(x?.stageName ?? "").trim())
              .filter((x) => x.length > 0)
          )
        );
        setAvailableStages(names);
        setStageRows(names.length > 0 ? [names[0]] : []);
      })
      .catch(() => {
        setAvailableStages([]);
        setStageRows([]);
      });
  }, []);

  const addStageRow = () => {
    setStageRows((prev) => {
      const used = new Set(prev.filter(Boolean));
      const next = availableStages.find((x) => !used.has(x));
      return next ? [...prev, next] : prev;
    });
  };
  const updateStageRow = (index: number, value: string) =>
    setStageRows((prev) => prev.map((item, i) => (i === index ? value : item)));
  const removeStageRow = (index: number) =>
    setStageRows((prev) => prev.filter((_, i) => i !== index));

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

      if (availableStages.length === 0) {
        setError("Please add stage list first from Settings > Stages.");
        return;
      }

      const cleanStages = stageRows.map((s) => s.trim()).filter(Boolean);
      if (cleanStages.length === 0) {
        setError("At least one interview stage is required.");
        return;
      }
      if (new Set(cleanStages).size !== cleanStages.length) {
        setError("Duplicate interview stage is not allowed.");
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
        applicationDeadlineUtc: v.applicationDeadlineUtc ? new Date(v.applicationDeadlineUtc).toISOString() : null,
        descriptionHtml,
        requirementsHtml,
        descriptionJson: "{}",
        requirementsJson: "{}",
        interviewStages: cleanStages.map((stageName, index) => ({
          stageName,
          stageOrder: index + 1,
          isActive: true
        }))
      };
      const res = await api.post("/api/jobs", payload);
      router.push(`/jobs/${res.data.id}`);
    } catch (e: any) {
      const rawData = e?.response?.data;
      if (typeof rawData === "string" && rawData.trim().length > 0) {
        setError(rawData);
        return;
      }
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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Interview Stages</div>
          <button
            type="button"
            className="border border-slate-300 bg-white text-slate-700 disabled:opacity-60"
            onClick={addStageRow}
            disabled={availableStages.length === 0 || stageRows.length >= availableStages.length}
          >
            Add Stage
          </button>
        </div>
        {availableStages.length === 0 ? (
          <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            No active stage found. Please add stages from Settings &gt; Stages.
          </div>
        ) : null}
        <div className="space-y-2">
          {stageRows.map((stage, index) => (
            <div className="grid gap-2 md:grid-cols-[80px_1fr_auto]" key={`stage-row-${index}`}>
              <input value={index + 1} readOnly />
              <select
                value={stage}
                onChange={(e) => updateStageRow(index, e.target.value)}
              >
                <option value="">Select stage</option>
                {availableStages
                  .filter((item) => item === stage || !stageRows.some((x, i) => i !== index && x === item))
                  .map((item) => (
                    <option key={`${index}-${item}`} value={item}>{item}</option>
                  ))}
              </select>
              <button
                type="button"
                className="bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60"
                onClick={() => removeStageRow(index)}
                disabled={stageRows.length === 1}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div><div>Description</div><RichEditor value={descriptionHtml} onChange={setDescriptionHtml} /></div>
      <div><div>Requirements</div><RichEditor value={requirementsHtml} onChange={setRequirementsHtml} /></div>
      <button className="bg-brand-500 text-white" type="submit">Save</button>
    </form>
  );
}
