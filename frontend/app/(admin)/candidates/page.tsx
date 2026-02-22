"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Link from "next/link";

export default function CandidatesPage() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { api.get("/api/candidates").then((r) => setItems(r.data.items)); }, []);
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Candidates</h1>
      {items.map((c) => <div key={c.id} className="card flex justify-between"><div>{c.fullName} ({c.email})</div><Link className="underline" href={`/candidates/${c.id}`}>Open</Link></div>)}
    </div>
  );
}
