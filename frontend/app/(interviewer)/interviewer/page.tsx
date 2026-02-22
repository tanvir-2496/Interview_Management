"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Link from "next/link";
import { toDhaka } from "@/lib/utils";

export default function InterviewerHome() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { api.get("/api/interviews/my-assigned").then((r) => setItems(r.data)); }, []);

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">My Assigned Interviews</h1>
      {items.map((i) => <div className="card" key={i.id}><div>{i.stage} - {toDhaka(i.startAtUtc)}</div><Link className="underline" href={`/interviewer/interviews/${i.id}`}>Open scorecard</Link></div>)}
    </div>
  );
}
