"use client";

import { useForm } from "react-hook-form";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
    <form className="card w-full max-w-sm space-y-3" onSubmit={onSubmit}>
      <h1 className="text-xl font-bold">Login</h1>
      {error ? <div className="text-red-600 text-sm">{error}</div> : null}
      <input placeholder="Email" {...register("email")} />
      <input placeholder="Password" type="password" {...register("password")} />
      <button className="bg-brand-500 text-white" type="submit">Login</button>
    </form>
  );
}
