"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function SettingsPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);

  const load = () => {
    api.get("/api/settings/email-templates").then((r) => setTemplates(r.data));
    api.get("/api/settings/stages").then((r) => setStages(r.data));
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="card">
        <h2 className="font-semibold">Stages</h2>
        {stages.map((s) => <div key={s.id}>{s.stageOrder}. {s.stageName} ({String(s.isActive)})</div>)}
      </div>
      <div className="card">
        <h2 className="font-semibold">Email Templates</h2>
        {templates.map((t) => <div key={t.id}>{t.templateKey}: {t.subject}</div>)}
      </div>
    </div>
  );
}
