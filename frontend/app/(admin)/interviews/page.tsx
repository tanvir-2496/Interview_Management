"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toDhaka } from "@/lib/utils";

export default function InterviewsPage() {
  const [items, setItems] = useState<any[]>([]);

  const load = () => api.get("/api/interviews").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  const sync = async (id: string) => {
    await api.post(`/api/interviews/${id}/calendar-sync?provider=google`);
    alert("Synced");
  };

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Interviews</h1>
      {items.map((i) => (
        <div key={i.id} className="card">
          <div>{i.stage} | {toDhaka(i.startAtUtc)} (Asia/Dhaka)</div>
          <div className="flex gap-2 mt-2">
            <button className="bg-brand-500 text-white" onClick={() => sync(i.id)}>Calendar Sync</button>
            <button className="bg-slate-700 text-white" onClick={() => api.post(`/api/interviews/${i.id}/send-invite`)}>Send Invite</button>
          </div>
        </div>
      ))}
    </div>
  );
}
