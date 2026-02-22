"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import HiringFunnel from "@/components/HiringFunnel";
import { AxiosError } from "axios";

export default function DashboardPage() {
  const [summary, setSummary] = useState<any>({});
  const [funnel, setFunnel] = useState<any[]>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    Promise.all([
      api.get("/api/analytics/summary"),
      api.get("/api/analytics/funnel")
    ])
      .then(([summaryRes, funnelRes]) => {
        setSummary(summaryRes.data);
        setFunnel(funnelRes.data);
        setError("");
      })
      .catch((e: AxiosError) => {
        if (e.response?.status === 403) {
          setError("You do not have permission to view dashboard analytics.");
          return;
        }
        setError("Failed to load dashboard data.");
      });
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      {error ? <div className="card text-red-600">{error}</div> : null}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(summary).map(([k, v]) => <div key={k} className="card"><div className="text-sm">{k}</div><div className="text-2xl font-semibold">{String(v)}</div></div>)}
      </div>
      <HiringFunnel data={funnel} />
    </div>
  );
}
