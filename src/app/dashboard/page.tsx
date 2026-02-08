"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Pipeline } from "@/lib/types";

interface User {
  name: string;
  email: string;
  role: string;
}

function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem("ai-pipeline-user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  useEffect(() => {
    async function loadPipelines() {
      try {
        const res = await fetch("/api/pipelines");
        const data = await res.json();
        setPipelines(data ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadPipelines();
  }, []);

  const { running, failed, succeeded, draft, other } = useMemo(() => {
    const byStatus = {
      running: [] as Pipeline[],
      failed: [] as Pipeline[],
      succeeded: [] as Pipeline[],
      draft: [] as Pipeline[],
      other: [] as Pipeline[],
    };

    for (const p of pipelines) {
      if (p.status === "running") byStatus.running.push(p);
      else if (p.status === "failed") byStatus.failed.push(p);
      else if (p.status === "succeeded") byStatus.succeeded.push(p);
      else if (p.status === "draft") byStatus.draft.push(p);
      else byStatus.other.push(p);
    }

    return byStatus;
  }, [pipelines]);

  const canCreate = user && (user.role === "admin" || user.role === "engineer");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">
                AI Pipeline Assistant
              </h1>
              <p className="mt-1 text-sm text-slate-300">
                Manage your data pipelines
              </p>
            </div>
            {user && (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm font-semibold text-white">{user.name}</div>
                  <div className="text-xs text-slate-300">{user.email}</div>
                </div>
                <div className="inline-flex items-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white shadow-sm">
                  {user.role}
                </div>
                <button
                  onClick={() => {
                    window.localStorage.removeItem("ai-pipeline-user");
                    window.location.href = "/";
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-rose-600 bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-rose-700 hover:border-rose-700"
                  title="Logout"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Title and Actions */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Pipelines</h2>
            <p className="mt-1 text-sm text-slate-300">
              Overview of all data pipelines and their status
            </p>
          </div>
          {canCreate && (
            <Link
              href="/pipelines/new"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-lg"
            >
              <span className="text-lg">+</span>
              New Pipeline
            </Link>
          )}
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-12 text-center shadow-sm">
            <div className="text-slate-300">Loading pipelines...</div>
          </div>
        ) : pipelines.length === 0 ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-12 text-center shadow-sm">
            <div className="mx-auto max-w-md">
              <div className="text-5xl">📊</div>
              <h3 className="mt-4 text-lg font-semibold text-white">
                No pipelines yet
              </h3>
              <p className="mt-2 text-sm text-slate-300">
                {canCreate
                  ? "Get started by creating your first data pipeline."
                  : "No pipelines have been created yet."}
              </p>
              {canCreate && (
                <Link
                  href="/pipelines/new"
                  className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-blue-700 hover:to-blue-800"
                >
                  <span className="text-lg">+</span>
                  Create Pipeline
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-amber-800">Running</div>
                    <div className="mt-1 text-3xl font-bold text-amber-900">
                      {running.length}
                    </div>
                  </div>
                  <div className="rounded-full bg-amber-500 p-3 text-white">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50 to-red-50 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-rose-800">Failed</div>
                    <div className="mt-1 text-3xl font-bold text-rose-900">
                      {failed.length}
                    </div>
                  </div>
                  <div className="rounded-full bg-rose-500 p-3 text-white">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-emerald-800">Succeeded</div>
                    <div className="mt-1 text-3xl font-bold text-emerald-900">
                      {succeeded.length}
                    </div>
                  </div>
                  <div className="rounded-full bg-emerald-500 p-3 text-white">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-gray-50 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-700">Draft</div>
                    <div className="mt-1 text-3xl font-bold text-slate-900">
                      {draft.length}
                    </div>
                  </div>
                  <div className="rounded-full bg-slate-500 p-3 text-white">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Pipeline Lists */}
            {[
              { title: "🟡 Running Pipelines", items: running, badgeClass: "bg-amber-100 text-amber-800 border-amber-300" },
              { title: "🔴 Failed Pipelines", items: failed, badgeClass: "bg-rose-100 text-rose-800 border-rose-300" },
              { title: "🟢 Succeeded Pipelines", items: succeeded, badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300" },
              { title: "⚪️ Draft Pipelines", items: draft, badgeClass: "bg-slate-100 text-slate-700 border-slate-300" },
            ].map(({ title, items, badgeClass }) =>
              items.length ? (
                <section key={title} className="space-y-4">
                  <h3 className="text-lg font-bold text-white">
                    {title} <span className="text-slate-400">({items.length})</span>
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {items.map((p) => (
                      <Link
                        key={p.id}
                        href={`/pipelines/${p.id}`}
                        className="group relative overflow-hidden rounded-xl border border-slate-700 bg-slate-800 p-5 shadow-sm transition-all hover:border-blue-500 hover:shadow-lg"
                      >
                        <div className="flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-3">
                            <h4 className="flex-1 text-base font-semibold text-white group-hover:text-blue-400">
                              {p.name}
                            </h4>
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${badgeClass}`}>
                              {p.status}
                            </span>
                          </div>
                          <p className="line-clamp-2 text-sm text-slate-300">
                            {p.description || "No description provided"}
                          </p>
                          <div className="mt-2 flex items-center justify-between border-t border-slate-700 pt-3 text-xs text-slate-400">
                            <span className="font-medium">{p.ownerEmail}</span>
                            <span>{new Date(p.updatedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r from-blue-500 to-blue-600 transition-all group-hover:w-full"></div>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null
            )}

            {other.length > 0 && (
              <section className="space-y-4">
                <h3 className="text-lg font-bold text-white">
                  Other Pipelines <span className="text-slate-400">({other.length})</span>
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {other.map((p) => (
                    <Link
                      key={p.id}
                      href={`/pipelines/${p.id}`}
                      className="group relative overflow-hidden rounded-xl border border-slate-700 bg-slate-800 p-5 shadow-sm transition-all hover:border-blue-500 hover:shadow-lg"
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="flex-1 text-base font-semibold text-white group-hover:text-blue-400">
                            {p.name}
                          </h4>
                          <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                            {p.status}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-sm text-slate-300">
                          {p.description || "No description provided"}
                        </p>
                        <div className="mt-2 flex items-center justify-between border-t border-slate-700 pt-3 text-xs text-slate-400">
                          <span className="font-medium">{p.ownerEmail}</span>
                          <span>{new Date(p.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r from-blue-500 to-blue-600 transition-all group-hover:w-full"></div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
