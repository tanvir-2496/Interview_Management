"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { CompanyProfile, defaultCompanyProfile, loadAdminCompanyProfile } from "@/lib/companyProfile";

export default function SettingsPage() {
  const [form, setForm] = useState<CompanyProfile>(defaultCompanyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    loadAdminCompanyProfile()
      .then((data) => {
        setForm(data);
        setError("");
      })
      .catch((e: any) => {
        setError(e?.response?.data?.title ?? e?.response?.data?.message ?? "Failed to load company settings.");
      })
      .finally(() => setLoading(false));
  }, []);

  const onChange = (key: keyof CompanyProfile, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSave = async () => {
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const res = await api.put("/api/settings/company-profile", form);
      setForm({ ...defaultCompanyProfile, ...(res.data ?? {}) });
      setNotice("Company settings saved.");
      setTimeout(() => setNotice(""), 2200);
    } catch (e: any) {
      setError(e?.response?.data?.title ?? e?.response?.data?.message ?? "Failed to save company settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Company Settings</h1>

      {loading ? <div className="card text-slate-600">Loading company settings...</div> : null}
      {error ? <div className="card border-red-200 bg-red-50 text-red-700">{error}</div> : null}
      {notice ? <div className="card border-emerald-200 bg-emerald-50 text-emerald-700">{notice}</div> : null}

      <div className="card space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm font-medium">
            <span>Company Name</span>
            <input value={form.companyName} onChange={(e) => onChange("companyName", e.target.value)} />
          </label>
          <label className="space-y-1 text-sm font-medium">
            <span>Location</span>
            <input value={form.location} onChange={(e) => onChange("location", e.target.value)} />
          </label>
          <label className="space-y-1 text-sm font-medium">
            <span>Contact Number</span>
            <input value={form.contactNumber} onChange={(e) => onChange("contactNumber", e.target.value)} />
          </label>
          <label className="space-y-1 text-sm font-medium">
            <span>Contact Email</span>
            <input value={form.contactEmail} onChange={(e) => onChange("contactEmail", e.target.value)} />
          </label>
          <label className="space-y-1 text-sm font-medium md:col-span-2">
            <span>Website URL</span>
            <input value={form.websiteUrl} onChange={(e) => onChange("websiteUrl", e.target.value)} />
          </label>
          <label className="space-y-1 text-sm font-medium md:col-span-2">
            <span>Address</span>
            <textarea rows={3} value={form.address} onChange={(e) => onChange("address", e.target.value)} />
          </label>
          <label className="space-y-1 text-sm font-medium md:col-span-2">
            <span>Company Description</span>
            <textarea rows={5} value={form.description} onChange={(e) => onChange("description", e.target.value)} />
          </label>
          <label className="space-y-1 text-sm font-medium md:col-span-2">
            <span>Logo URL / Path</span>
            <input value={form.logoUrl} onChange={(e) => onChange("logoUrl", e.target.value)} placeholder="/NAAS-Logo.png" />
          </label>
        </div>

        <div className="flex justify-end">
          <button type="button" className="bg-brand-500 text-white hover:bg-brand-700 disabled:opacity-70" onClick={onSave} disabled={saving || loading}>
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
