"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function CandidateDetailPage({ params }: { params: { id: string } }) {
  const [candidate, setCandidate] = useState<any>();
  const [timeline, setTimeline] = useState<any[]>([]);

  useEffect(() => {
    api.get(`/api/candidates/${params.id}`).then((r) => setCandidate(r.data));
    api.get(`/api/candidates/${params.id}/timeline`).then((r) => setTimeline(r.data));
  }, [params.id]);

  const parse = async () => {
    await api.post(`/api/candidates/${params.id}/parse-resume`);
    alert("Parse queued");
  };

  if (!candidate) return <div>Loading...</div>;

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">{candidate.fullName}</h1>
      <div className="card">{candidate.email} | {candidate.phone}</div>
      <button className="bg-brand-500 text-white" onClick={parse}>Parse Resume</button>
      <div className="card">
        <h2 className="font-semibold mb-2">Timeline</h2>
        {timeline.map((t) => <div key={t.id}>{t.eventType} - {new Date(t.createdAtUtc).toLocaleString()}</div>)}
      </div>
    </div>
  );
}
