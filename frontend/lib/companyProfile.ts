"use client";

import api from "@/lib/api";

export type CompanyProfile = {
  companyName: string;
  location: string;
  address: string;
  contactNumber: string;
  contactEmail: string;
  websiteUrl: string;
  description: string;
  logoUrl: string;
};

export const defaultCompanyProfile: CompanyProfile = {
  companyName: "NAAS Solutions Limited",
  location: "Dhaka, Bangladesh",
  address: "H#3 (4th Floor), R#3, Block #B, Rampura, Banasree, Dhaka.",
  contactNumber: "+880 1841-428736",
  contactEmail: "info@naasbd.com",
  websiteUrl: "https://naasbd.com/",
  description:
    "NAAS Solutions Limited is a technology-driven company focused on secure and scalable software products. We work with modern engineering practices and client-centric delivery to build meaningful digital solutions for local and global markets.",
  logoUrl: "/NAAS-Logo.png"
};

function mergeWithDefault(payload: Partial<CompanyProfile> | null | undefined): CompanyProfile {
  return { ...defaultCompanyProfile, ...(payload ?? {}) };
}

export async function loadPublicCompanyProfile(): Promise<CompanyProfile> {
  const res = await api.get("/api/public/settings/company-profile");
  return mergeWithDefault(res.data);
}

export async function loadAdminCompanyProfile(): Promise<CompanyProfile> {
  const res = await api.get("/api/settings/company-profile");
  return mergeWithDefault(res.data);
}
