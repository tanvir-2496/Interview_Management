"use client";

import { useForm } from "react-hook-form";
import api from "@/lib/api";

export default function InterviewerScorecardPage({ params }: { params: { id: string } }) {
  const { register, handleSubmit } = useForm<any>();
  const onSubmit = handleSubmit(async (v) => {
    const payload = {
      interviewSessionId: params.id,
      privateNotes: v.privateNotes,
      recommendation: v.recommendation,
      ratings: [
        { criterion: "TechnicalSkill", score: Number(v.technical) },
        { criterion: "Communication", score: Number(v.communication) },
        { criterion: "TeamFit", score: Number(v.teamfit) }
      ]
    };
    await api.post("/api/scorecards", payload);
    alert("Submitted");
  });

  return (
    <form className="card max-w-xl space-y-3" onSubmit={onSubmit}>
      <h1 className="text-xl font-bold">Submit Scorecard</h1>
      <input type="number" min={1} max={5} placeholder="Technical (1-5)" {...register("technical")} />
      <input type="number" min={1} max={5} placeholder="Communication (1-5)" {...register("communication")} />
      <input type="number" min={1} max={5} placeholder="Team Fit (1-5)" {...register("teamfit")} />
      <textarea placeholder="Private notes" {...register("privateNotes")} />
      <select {...register("recommendation")}><option>Strong Hire</option><option>Hire</option><option>No Hire</option></select>
      <button className="bg-brand-500 text-white" type="submit">Submit</button>
    </form>
  );
}
