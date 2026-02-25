"use client";

import { useEffect, useState } from "react";
import { defaultCompanyProfile, loadPublicCompanyProfile } from "@/lib/companyProfile";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const [company, setCompany] = useState(defaultCompanyProfile);

  useEffect(() => {
    loadPublicCompanyProfile().then(setCompany).catch(() => setCompany(defaultCompanyProfile));
  }, []);

  return (
    <div className="min-h-screen bg-slate-100">
      <main className="mx-auto w-full max-w-7xl p-4 md:p-6">{children}</main>
      <footer className="border-t border-slate-200 bg-white p-4 text-center text-xs text-slate-500">
        (c) {new Date().getFullYear()} {company.companyName}
      </footer>
    </div>
  );
}
