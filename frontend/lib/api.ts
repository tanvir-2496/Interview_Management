"use client";

import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"
});

api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (typeof window === "undefined") return Promise.reject(error);

    const original = error.config;
    const status = error?.response?.status;

    if (status === 401 && original && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem("refreshToken");

      if (!refreshToken) {
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"}/api/auth/refresh`,
          { refreshToken }
        );

        localStorage.setItem("accessToken", res.data.accessToken);
        localStorage.setItem("refreshToken", res.data.refreshToken);
        if (Array.isArray(res.data.permissions)) {
          localStorage.setItem("permissions", JSON.stringify(res.data.permissions));
        }

        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${res.data.accessToken}`;
        return api(original);
      } catch {
        localStorage.clear();
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
