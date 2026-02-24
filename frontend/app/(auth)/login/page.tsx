"use client";

import { useForm } from "react-hook-form";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";

export default function LoginPage() {
  const { register, handleSubmit } = useForm<{ email: string; password: string }>();
  const router = useRouter();
  const [error, setError] = useState<string>("");

  const onSubmit = handleSubmit(async (v) => {
    setError("");
    try {
      const r = await api.post("/api/auth/login", v);
      localStorage.setItem("accessToken", r.data.accessToken);
      localStorage.setItem("refreshToken", r.data.refreshToken);
      localStorage.setItem("permissions", JSON.stringify(r.data.permissions));

      const permissions: string[] = r.data.permissions ?? [];
      const isInterviewerOnly =
        permissions.includes("Interviews.SubmitScorecard") &&
        !permissions.includes("Jobs.Create") &&
        !permissions.includes("Candidates.View");

      if (isInterviewerOnly) {
        router.push("/interviewer");
        return;
      }

      if (permissions.includes("Analytics.ViewReports")) {
        router.push("/dashboard");
        return;
      }

      if (permissions.includes("Candidates.View")) {
        router.push("/candidates");
        return;
      }

      if (permissions.includes("Interviews.View")) {
        router.push("/interviews");
        return;
      }

      if (permissions.includes("Jobs.Create") || permissions.includes("Jobs.Edit")) {
        router.push("/jobs");
        return;
      }

      setError("Logged in, but no accessible module is assigned to this account.");
    } catch (e: any) {
      const message =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        (e?.response?.status ? `Login failed (${e.response.status})` : "Network error");
      setError(message);
    }
  });

  return (
    <form className="card w-full max-w-md space-y-5 p-6" onSubmit={onSubmit}>
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <div className="rounded-lg bg-cyan-50 p-2 ring-1 ring-cyan-100">
          <Image src="/NAAS-Logo.png" alt="NAAS Logo" width={42} height={42} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">NAAS Solutions Limited</h1>
          <p className="text-sm text-slate-500">Interview Management Portal</p>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Login</h2>
        {error ? <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">{error}</div> : null}
        <input placeholder="Email" {...register("email")} />
        <input placeholder="Password" type="password" {...register("password")} />
        <button className="w-full bg-brand-500 text-white hover:bg-brand-700" type="submit">Login</button>
      </div>
    </form>
  );
}
