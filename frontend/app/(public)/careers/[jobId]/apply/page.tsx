"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import api from "@/lib/api";

const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6),
  source: z.string().default("Portal"),
  overrideDuplicate: z.boolean().default(false)
});

export default function ApplyPage({ params }: { params: { jobId: string } }) {
  const { register, handleSubmit } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    const file = (document.getElementById("resume") as HTMLInputElement)?.files?.[0];
    if (!file) return alert("Resume required");
    const form = new FormData();
    Object.entries(values).forEach(([k, v]) => form.append(k, String(v)));
    form.append("resume", file);
    await api.post(`/api/public/jobs/${params.jobId}/apply`, form, { headers: { "Content-Type": "multipart/form-data" } });
    alert("Applied");
  });

  return (
    <form className="card max-w-xl space-y-3" onSubmit={onSubmit}>
      <h1 className="text-xl font-bold">Apply</h1>
      <input placeholder="Full Name" {...register("fullName")} />
      <input placeholder="Email" {...register("email")} />
      <input placeholder="Phone" {...register("phone")} />
      <select {...register("source")}>
        <option>Portal</option><option>LinkedIn</option><option>Referral</option><option>WhatsApp</option><option>Other</option>
      </select>
      <label className="flex gap-2"><input type="checkbox" {...register("overrideDuplicate")} /> Override duplicate check</label>
      <input id="resume" type="file" accept=".pdf,.doc,.docx" />
      <button className="bg-brand-500 text-white" type="submit">Submit</button>
    </form>
  );
}
