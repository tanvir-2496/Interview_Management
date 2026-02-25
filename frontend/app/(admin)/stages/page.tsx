"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

type StageItem = {
  id: string;
  jobId: string;
  stageName: string;
  stageOrder: number;
  isActive: boolean;
};

const GLOBAL_STAGE_JOB_ID = "00000000-0000-0000-0000-000000000000";

export default function StagesPage() {
  const [stages, setStages] = useState<StageItem[]>([]);
  const [newStageName, setNewStageName] = useState("");
  const [newStageOrder, setNewStageOrder] = useState<number>(1);
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editStageName, setEditStageName] = useState("");
  const [editStageOrder, setEditStageOrder] = useState<number>(1);
  const [editStageIsActive, setEditStageIsActive] = useState(true);
  const [error, setError] = useState("");

  const loadStages = async () => {
    setError("");
    try {
      const res = await api.get("/api/settings/stages");
      const ordered = ((res.data ?? []) as StageItem[]).sort((a, b) => a.stageOrder - b.stageOrder);
      setStages(ordered);
      setNewStageOrder((ordered[ordered.length - 1]?.stageOrder ?? 0) + 1);
    } catch (e: any) {
      setError(e?.response?.data?.title ?? e?.response?.data?.message ?? "Failed to load stages.");
    }
  };

  useEffect(() => {
    loadStages();
  }, []);

  const addStage = async () => {
    const stageNames = newStageName
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    if (stageNames.length === 0) {
      setError("Stage name is required.");
      return;
    }

    setError("");
    setIsAddingStage(true);
    try {
      const startOrder = Number(newStageOrder) || stages.length + 1;
      for (let i = 0; i < stageNames.length; i += 1) {
        await api.post("/api/settings/stages", {
          jobId: GLOBAL_STAGE_JOB_ID,
          stageName: stageNames[i],
          stageOrder: startOrder + i,
          isActive: true
        });
      }
      setNewStageName("");
      await loadStages();
    } catch (e: any) {
      setError(e?.response?.data?.title ?? e?.response?.data?.message ?? "Failed to add stage.");
    } finally {
      setIsAddingStage(false);
    }
  };

  const startEditStage = (stage: StageItem) => {
    setEditingStageId(stage.id);
    setEditStageName(stage.stageName);
    setEditStageOrder(stage.stageOrder);
    setEditStageIsActive(stage.isActive);
  };

  const saveEditStage = async () => {
    if (!editingStageId) return;
    const stageName = editStageName.trim();
    if (!stageName) {
      setError("Stage name is required.");
      return;
    }

    setError("");
    try {
      await api.put(`/api/settings/stages/${editingStageId}`, {
        stageName,
        stageOrder: Number(editStageOrder) || 1,
        isActive: editStageIsActive
      });
      setEditingStageId(null);
      await loadStages();
    } catch (e: any) {
      setError(e?.response?.data?.title ?? e?.response?.data?.message ?? "Failed to update stage.");
    }
  };

  const deleteStage = async (id: string) => {
    setError("");
    try {
      await api.delete(`/api/settings/stages/${id}`);
      if (editingStageId === id) setEditingStageId(null);
      await loadStages();
    } catch (e: any) {
      setError(e?.response?.data?.title ?? e?.response?.data?.message ?? "Failed to delete stage.");
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Stages</h1>
      {error ? <div className="card border-red-200 bg-red-50 text-red-700">{error}</div> : null}

      <div className="card">
        <h2 className="font-semibold">Interview Stages</h2>
        <p className="mt-1 text-sm text-slate-600">Add, edit, and delete interview stages from this page.</p>

        <div className="mt-4 grid gap-2 md:grid-cols-[1fr_140px_auto]">
          <input
            placeholder="e.g. Written, Viva, Assignment, Coding Test"
            value={newStageName}
            onChange={(e) => setNewStageName(e.target.value)}
          />
          <input
            type="number"
            min={1}
            value={newStageOrder}
            onChange={(e) => setNewStageOrder(Number(e.target.value) || 1)}
          />
          <button type="button" className="bg-brand-500 text-white hover:bg-brand-700 disabled:opacity-70" onClick={addStage} disabled={isAddingStage}>
            {isAddingStage ? "Adding..." : "Add Stage"}
          </button>
        </div>

        <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">Order</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">Stage Name</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">Active</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {stages.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={4}>No stages found yet.</td>
                </tr>
              ) : null}

              {stages.map((stage) => {
                const isEditing = editingStageId === stage.id;
                return (
                  <tr key={stage.id}>
                    <td className="px-3 py-2 align-top">
                      {isEditing ? (
                        <input type="number" min={1} value={editStageOrder} onChange={(e) => setEditStageOrder(Number(e.target.value) || 1)} />
                      ) : (
                        stage.stageOrder
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {isEditing ? (
                        <input value={editStageName} onChange={(e) => setEditStageName(e.target.value)} />
                      ) : (
                        stage.stageName
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {isEditing ? (
                        <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                          <input
                            className="h-4 w-4 !w-4 !px-0 !py-0"
                            type="checkbox"
                            checked={editStageIsActive}
                            onChange={(e) => setEditStageIsActive(e.target.checked)}
                          />
                          Active
                        </label>
                      ) : (
                        <span className={stage.isActive ? "text-emerald-700" : "text-slate-500"}>{stage.isActive ? "Yes" : "No"}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right align-top">
                      {isEditing ? (
                        <div className="flex justify-end gap-2">
                          <button type="button" className="border border-slate-300 bg-white text-slate-700" onClick={() => setEditingStageId(null)}>Cancel</button>
                          <button type="button" className="bg-brand-500 text-white hover:bg-brand-700" onClick={saveEditStage}>Save</button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button type="button" className="border border-slate-300 bg-white text-slate-700" onClick={() => startEditStage(stage)}>Edit</button>
                          <button type="button" className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => deleteStage(stage.id)}>Delete</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
