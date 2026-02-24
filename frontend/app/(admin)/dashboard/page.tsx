"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { getPermissions } from "@/lib/utils";

type ApprovalItem = {
  id: string;
  title: string;
  jobCode: string;
  department: string;
  locationText: string;
  applicationDeadlineUtc?: string | null;
  createdAtUtc: string;
};

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  entityName: string;
  entityId?: string | null;
  isRead: boolean;
  createdAtUtc: string;
};

type InterviewItem = {
  id: string;
  stage: string;
  startAtUtc: string;
  endAtUtc: string;
  timezone: string;
  locationOrMeetingLink: string;
};

type JobDetails = {
  id: string;
  title: string;
  jobCode: string;
  department: string;
  locationText: string;
  status: number;
  applicationDeadlineUtc?: string | null;
  descriptionHtml?: string;
  requirementsHtml?: string;
};

type DashboardData = {
  summary: {
    totalJobs: number;
    activeJobs: number;
    pendingApprovals: number;
    totalCandidates: number;
    interviews: number;
  };
  canApprove: boolean;
  approvalQueue: ApprovalItem[];
  notifications: NotificationItem[];
  unreadCount: number;
};

function parseUserNameFromJwt() {
  if (typeof window === "undefined") return "Team";
  const token = localStorage.getItem("accessToken");
  if (!token) return "Team";

  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(normalized);
    const json = JSON.parse(decoded) as { name?: string };
    return json.name?.trim() || "Team";
  } catch {
    return "Team";
  }
}

function daysOpen(createdAtUtc: string) {
  const created = new Date(createdAtUtc).getTime();
  const now = Date.now();
  const ms = Math.max(0, now - created);
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

const dhakaDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Dhaka",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

const dhakaTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Dhaka",
  hour: "numeric",
  minute: "2-digit",
  hour12: true
});

function toDhakaDateKey(dateLike: Date | string) {
  return dhakaDateFormatter.format(new Date(dateLike));
}

function buildCurrentWeek() {
  const now = new Date();
  const base = new Date(now);
  const day = base.getDay();
  const shift = day === 0 ? -6 : 1 - day;
  base.setDate(base.getDate() + shift);

  return Array.from({ length: 7 }, (_, idx) => {
    const date = new Date(base);
    date.setDate(base.getDate() + idx);
    return date;
  });
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [interviews, setInterviews] = useState<InterviewItem[]>([]);
  const [toast, setToast] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [userName, setUserName] = useState("Team");
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobDetails | null>(null);
  const [drawerComment, setDrawerComment] = useState("");
  const [drawerLoading, setDrawerLoading] = useState(false);

  const showToast = (kind: "success" | "error", text: string) => {
    setToast({ kind, text });
  };

  const loadDashboard = async () => {
    try {
      const res = await api.get("/api/dashboard");
      setData(res.data);
    } catch {
      // Keep current UI data if refresh fails silently.
    }
  };

  const loadInterviewWidget = async () => {
    try {
      const myAssigned = await api.get("/api/interviews/my-assigned");
      setInterviews(myAssigned.data ?? []);
      return;
    } catch {
      const perms = getPermissions();
      if (!perms.includes("Interviews.View")) {
        setInterviews([]);
        return;
      }
    }

    try {
      const all = await api.get("/api/interviews");
      setInterviews(all.data ?? []);
    } catch {
      setInterviews([]);
    }
  };

  const reloadAll = async () => {
    await Promise.all([loadDashboard(), loadInterviewWidget()]);
  };

  useEffect(() => {
    setUserName(parseUserNameFromJwt());
    reloadAll();

    const timer = window.setInterval(() => {
      reloadAll();
    }, 10000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const reviewAction = async (jobId: string, type: "approve" | "reject") => {
    setToast(null);
    try {
      await api.post(`/api/jobs/${jobId}/${type}`, {
        reason: type === "reject" ? "Rejected from dashboard review." : null
      });
      showToast("success", type === "approve" ? "Job approved successfully." : "Job rejected successfully.");
      setReviewingId(null);
      await reloadAll();
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        `Action failed (${e?.response?.status || "network"})`;
      showToast("error", msg);
    }
  };

  const markRead = async (id: string) => {
    await api.post(`/api/dashboard/notifications/${id}/read`);
    await loadDashboard();
  };

  const openNotification = async (notification: NotificationItem) => {
    setSelectedNotification(notification);
    setDrawerComment("");
    if (notification.entityName !== "Job" || !notification.entityId) {
      setSelectedJob(null);
      return;
    }

    setDrawerLoading(true);
    try {
      const res = await api.get(`/api/jobs/${notification.entityId}`);
      setSelectedJob(res.data);
    } catch {
      setSelectedJob(null);
      showToast("error", "Failed to load job details for this notification.");
    } finally {
      setDrawerLoading(false);
    }
  };

  const closeNotificationDrawer = () => {
    setSelectedNotification(null);
    setSelectedJob(null);
    setDrawerComment("");
    setDrawerLoading(false);
  };

  const reviewFromNotification = async (type: "approve" | "reject") => {
    if (!selectedNotification?.entityId) return;

    setToast(null);
    try {
      await api.post(`/api/jobs/${selectedNotification.entityId}/${type}`, {
        reason: drawerComment.trim() || null
      });

      if (!selectedNotification.isRead) {
        await markRead(selectedNotification.id);
      } else {
        await reloadAll();
      }

      showToast("success", type === "approve" ? "Job approved successfully." : "Job rejected successfully.");
      closeNotificationDrawer();
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        `Action failed (${e?.response?.status || "network"})`;
      showToast("error", msg);
    }
  };

  const approvalSections = useMemo(() => {
    const queue = data?.approvalQueue ?? [];
    return [
      {
        title: "Offer Approvals",
        footer: "VIEW ALL OFFER APPROVALS",
        items: queue.filter((_, idx) => idx % 3 === 0)
      },
      {
        title: "Requisition Approvals",
        footer: "VIEW ALL REQUISITION APPROVALS",
        items: queue.filter((_, idx) => idx % 3 === 1)
      },
      {
        title: "Job Approvals",
        footer: "VIEW ALL JOB APPROVALS",
        items: queue.filter((_, idx) => idx % 3 === 2)
      }
    ];
  }, [data?.approvalQueue]);

  const unreadNotifications = (data?.notifications ?? []).filter((n) => !n.isRead);

  const weekDates = useMemo(() => buildCurrentWeek(), []);
  const interviewsByDay = useMemo(() => {
    const grouped = new Map<string, InterviewItem[]>();
    for (const item of interviews) {
      const key = toDhakaDateKey(item.startAtUtc);
      const list = grouped.get(key) ?? [];
      list.push(item);
      grouped.set(key, list);
    }
    return grouped;
  }, [interviews]);

  const todayKey = toDhakaDateKey(new Date());
  const todayInterviews = interviewsByDay.get(todayKey) ?? [];
  const weekCount = weekDates.reduce((acc, date) => acc + (interviewsByDay.get(toDhakaDateKey(date))?.length ?? 0), 0);

  return (
    <div className="mx-auto max-w-[1300px] space-y-6 text-[#2a3028]">
      {toast ? (
        <div className="pointer-events-none fixed left-1/2 top-6 z-[70] -translate-x-1/2">
          <div className={`rounded-lg px-5 py-3 text-sm font-medium text-white shadow-lg ${
            toast.kind === "success" ? "bg-emerald-600" : "bg-red-600"
          }`}>
            {toast.text}
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.9fr_0.7fr]">
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-5xl font-semibold leading-tight tracking-tight text-[#2b2d23]">Welcome back, {userName}</h1>
            <div className="pt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8b876f]">
              {new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded border border-[#d9d3c1] bg-[#f4f1e6] p-5">
              <div className="text-5xl font-semibold text-[#262b22]">{data?.summary.totalCandidates ?? 0}</div>
              <div className="mt-1 text-base text-[#505343]">New applications</div>
              <div className="text-xs text-[#8f8a73]">Since last login</div>
            </div>
            <div className="rounded border border-[#d9d3c1] bg-[#f4f1e6] p-5">
              <div className="text-5xl font-semibold text-[#262b22]">{data?.summary.activeJobs ?? 0}</div>
              <div className="mt-1 text-base text-[#505343]">Open jobs</div>
              <div className="text-xs text-[#8f8a73]">{data?.summary.totalJobs ?? 0} total jobs</div>
            </div>
          </div>

          {approvalSections.map((section) => (
            <section key={section.title} className="space-y-3">
              <h2 className="text-4xl font-semibold tracking-tight text-[#2c3024]">{section.title}</h2>
              {section.items.length === 0 ? (
                <div className="rounded border border-[#d6cfbc] bg-white px-5 py-6 text-sm text-[#8b866f]">
                  No items pending in this section.
                </div>
              ) : null}

              {section.items.map((item) => (
                <div key={item.id} className="rounded border border-[#d6cfbc] bg-white p-5">
                  <div className="grid items-center gap-4 md:grid-cols-[1fr_auto]">
                    <div className="space-y-1">
                      <div className="text-lg font-semibold text-[#1f271f]">{item.title}</div>
                      <div className="text-sm text-[#6d715e]">{item.jobCode} | {item.department} | {item.locationText}</div>
                      <div className="text-xs text-[#86836d]">
                        Created: {new Date(item.createdAtUtc).toLocaleDateString()}
                        {item.applicationDeadlineUtc ? ` | Deadline: ${new Date(item.applicationDeadlineUtc).toLocaleDateString()}` : ""}
                      </div>
                    </div>

                    {data?.canApprove ? (
                      <button
                        className="border border-[#395549] bg-[#244439] px-6 py-2 text-xs font-semibold tracking-[0.14em] text-white"
                        onClick={() => setReviewingId((current) => (current === item.id ? null : item.id))}
                      >
                        REVIEW
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-4 flex items-end justify-between border-t border-[#ebe5d4] pt-4">
                    <div>
                      <div className="text-5xl font-semibold text-[#1f261f]">{daysOpen(item.createdAtUtc)}</div>
                      <div className="text-sm text-[#747864]">Days open</div>
                    </div>
                    {reviewingId === item.id && data?.canApprove ? (
                      <div className="flex gap-2">
                        <button className="bg-[#245041] px-5 py-2 text-sm text-white" onClick={() => reviewAction(item.id, "approve")}>Approve</button>
                        <button className="bg-[#d94b4b] px-5 py-2 text-sm text-white" onClick={() => reviewAction(item.id, "reject")}>Reject</button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}

              <div className="pt-1 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-[#979273]">
                {section.footer}
              </div>
            </section>
          ))}
        </div>

        <aside className="space-y-4">
          <div className="rounded border border-[#d6cfbc] bg-[#f4f1e6] p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7f7c67]">Interviews</div>
              <div className="text-xs text-[#6f6b58]">My interviews</div>
            </div>
            <div className="mt-4 rounded border border-[#efddd8] bg-[#fcece8] p-4 text-[#cc735f]">
              <div className="text-4xl font-semibold">{weekCount}</div>
              <div className="text-sm">Interviews scheduled this week.</div>
            </div>

            <div className="mt-4 rounded border border-[#ded7c6] bg-white px-3 py-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#86826d]">This Week Calendar</div>
              <div className="grid grid-cols-7 gap-1">
                {weekDates.map((date) => {
                  const key = toDhakaDateKey(date);
                  const isToday = key === todayKey;
                  const hasInterviews = (interviewsByDay.get(key)?.length ?? 0) > 0;
                  return (
                    <div key={key} className="text-center">
                      <div className="text-[10px] text-[#8f8a74]">
                        {date.toLocaleDateString("en-US", { weekday: "short", timeZone: "Asia/Dhaka" })}
                      </div>
                      <div className={`mx-auto mt-1 grid h-7 w-7 place-items-center rounded-full text-xs ${
                        isToday ? "bg-[#ea8c6a] text-white" : "text-[#4c5448]"
                      }`}>
                        {date.toLocaleDateString("en-US", { day: "numeric", timeZone: "Asia/Dhaka" })}
                      </div>
                      {hasInterviews ? <div className="mx-auto mt-1 h-1.5 w-1.5 rounded-full bg-[#2f755f]" /> : <div className="mt-1 h-1.5" />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4">
              {todayInterviews.length === 0 ? (
                <div className="text-xs text-[#777463]">Nobody has any interviews scheduled on this date.</div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#75705f]">Today&apos;s Schedule</div>
                  {todayInterviews.map((interview) => (
                    <div key={interview.id} className="rounded border border-[#dfd8c6] bg-white px-3 py-2">
                      <div className="text-sm font-medium text-[#2d342b]">{interview.stage}</div>
                      <div className="text-xs text-[#6f7361]">
                        {dhakaTimeFormatter.format(new Date(interview.startAtUtc))} | {interview.locationOrMeetingLink || "Interview room"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded border border-[#d6cfbc] bg-white">
            <div className="flex items-center justify-between border-b border-[#ece6d5] px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7f7c67]">Unread Notifications</div>
              <span className="rounded-full bg-[#e14d4d] px-2 py-0.5 text-[10px] font-semibold text-white">{data?.unreadCount ?? 0}</span>
            </div>
            <div className="max-h-[620px] overflow-auto">
              {unreadNotifications.length === 0 ? (
                <div className="px-4 py-6 text-sm text-[#8a866f]">No notifications yet.</div>
              ) : null}
              {unreadNotifications.map((n) => (
                <div key={n.id} className="space-y-1 border-b border-[#f0ebdd] bg-[#fffaf2] px-4 py-3">
                  <div className="text-sm font-medium text-[#2b3025]">{n.title}</div>
                  <div className="text-sm text-[#666b58]">{n.message}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#8e8b74]">{new Date(n.createdAtUtc).toLocaleString()}</span>
                    <div className="flex items-center gap-2">
                      {n.entityName === "Job" && n.entityId ? (
                        <button
                          className="border border-[#9fae9f] bg-[#244439] px-2 py-1 text-[11px] text-white"
                          onClick={() => openNotification(n)}
                        >
                          Open
                        </button>
                      ) : null}
                      <button
                        className="border border-[#d8d2bf] bg-white px-2 py-1 text-[11px] text-[#536150]"
                        onClick={() => markRead(n.id)}
                      >
                        Mark read
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {selectedNotification ? (
        <div className="fixed inset-0 z-50 bg-black/30">
          <div className="ml-auto flex h-full w-full max-w-[560px] flex-col border-l border-[#d5cfbe] bg-[#f7f3e8]">
            <div className="flex items-center justify-between border-b border-[#e1dbc9] px-5 py-4">
              <h3 className="text-2xl font-semibold text-[#2a2e25]">Approval Review</h3>
              <button className="border border-[#c8c2b2] bg-white px-3 py-1 text-sm" onClick={closeNotificationDrawer}>
                Close
              </button>
            </div>

            <div className="flex-1 overflow-auto px-5 py-4">
              {drawerLoading ? <div className="text-sm text-[#666b58]">Loading details...</div> : null}

              {!drawerLoading && selectedJob ? (
                <div className="space-y-4">
                  <div className="rounded border border-[#d8d2bf] bg-white p-4">
                    <div className="text-xl font-semibold text-[#2c3024]">{selectedJob.title}</div>
                    <div className="mt-1 text-sm text-[#5e624f]">{selectedJob.jobCode} | {selectedJob.department}</div>
                    <div className="text-sm text-[#5e624f]">{selectedJob.locationText}</div>
                    <div className="mt-2 text-xs text-[#8c8872]">
                      Deadline: {selectedJob.applicationDeadlineUtc ? new Date(selectedJob.applicationDeadlineUtc).toLocaleDateString() : "N/A"}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6f6b58]">Comment</div>
                    <textarea
                      rows={4}
                      value={drawerComment}
                      onChange={(e) => setDrawerComment(e.target.value)}
                      placeholder="Write your approval/rejection comment"
                    />
                  </div>

                  <div className="flex gap-2">
                    {data?.canApprove ? (
                      <>
                        <button className="bg-[#244439] text-white" onClick={() => reviewFromNotification("approve")}>Approve</button>
                        <button className="bg-[#d94b4b] text-white" onClick={() => reviewFromNotification("reject")}>Reject</button>
                      </>
                    ) : null}
                    {!selectedNotification.isRead ? (
                      <button className="border border-[#cfc8b6] bg-white" onClick={() => markRead(selectedNotification.id)}>
                        Mark read
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {!drawerLoading && !selectedJob ? (
                <div className="rounded border border-[#d8d2bf] bg-white p-4 text-sm text-[#666b58]">
                  Details are not available for this notification.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
