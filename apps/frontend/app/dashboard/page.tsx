"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface WebsiteTick {
  id: string;
  website_id: string;
  region_id: string;
  response_time_ms: number;
  status: "up" | "down";
  created_at: string;
}

interface Website {
  id: string;
  url: string;
  user_id: string;
  created_at: string;
  ticks?: WebsiteTick[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch all websites and detailed ticks
  const fetchWebsites = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch("http://localhost:8080/api/websites", {
        credentials: "include",
      });

      if (res.status === 401) {
        router.push("/signin");
        return;
      }

      if (!res.ok) throw new Error("Failed to load websites");

      const data: Website[] = await res.json();
      
      // For each website, fetch its latest details (including ticks)
      const enriched = await Promise.all(
        data.map(async (site) => {
          try {
            const detailRes = await fetch(`http://localhost:8080/api/websites/${site.id}`, {
              credentials: "include",
            });
            if (detailRes.ok) {
              const detailData: Website = await detailRes.json();
              return detailData;
            }
          } catch (e) {
            // fallback to site without ticks
          }
          return site;
        })
      );

      setWebsites(enriched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchWebsites();
    // Auto-refresh data every 30 seconds for live monitoring!
    const timer = setInterval(() => fetchWebsites(true), 30000);
    return () => clearInterval(timer);
  }, [fetchWebsites]);

  async function handleAddWebsite(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");

    let urlToSubmit = newUrl.trim();
    if (!urlToSubmit.startsWith("http://") && !urlToSubmit.startsWith("https://")) {
      urlToSubmit = "https://" + urlToSubmit;
    }

    setAdding(true);
    try {
      const res = await fetch("http://localhost:8080/api/websites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlToSubmit }),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add website");

      setNewUrl("");
      setShowAddModal(false);
      fetchWebsites(true);
    } catch (err: any) {
      setAddError(err.message || "Failed to add website");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to stop monitoring this website?")) return;

    setDeletingId(id);
    try {
      const res = await fetch(`http://localhost:8080/api/websites/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setWebsites((prev) => prev.filter((w) => w.id !== id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSignout() {
    try {
      await fetch("http://localhost:8080/api/auth/signout", {
        method: "POST",
        credentials: "include",
      });
      router.push("/signin");
    } catch (err) {
      router.push("/signin");
    }
  }

  // Calculate Dashboard Metrics
  const totalMonitors = websites.length;
  const upMonitors = websites.filter((w) => {
    const lastTick = w.ticks && w.ticks.length > 0 ? w.ticks[w.ticks.length - 1] : null;
    return lastTick ? lastTick.status === "up" : true;
  }).length;
  const downMonitors = totalMonitors - upMonitors;

  // Average response time across all websites
  let allLatencies: number[] = [];
  websites.forEach((w) => {
    if (w.ticks && w.ticks.length > 0) {
      const recent = w.ticks.slice(-10);
      recent.forEach((t) => {
        if (t.response_time_ms > 0) allLatencies.push(t.response_time_ms);
      });
    }
  });
  const avgLatency =
    allLatencies.length > 0
      ? Math.round(allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length)
      : 0;

  return (
    <div className="min-h-screen bg-[#090d16] text-zinc-100 flex flex-col antialiased">
      {/* Top Navbar */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/60 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-md shadow-emerald-500/10">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              UptimeGo
            </span>
            <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ml-1">
              Live Engine
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchWebsites(true)}
              disabled={refreshing}
              title="Refresh status"
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <svg
                className={`w-4 h-4 ${refreshing ? "animate-spin text-emerald-400" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Monitor</span>
            </button>

            <button
              onClick={handleSignout}
              title="Sign Out"
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-sm">
            <span className="text-xs font-medium text-zinc-400 block mb-1">Total Monitors</span>
            <div className="text-2xl font-bold text-zinc-100">{totalMonitors}</div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-sm">
            <span className="text-xs font-medium text-zinc-400 block mb-1">Operational</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-emerald-400">{upMonitors}</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">
                {totalMonitors > 0 ? `${Math.round((upMonitors / totalMonitors) * 100)}%` : "100%"}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-sm">
            <span className="text-xs font-medium text-zinc-400 block mb-1">Degraded / Down</span>
            <div className="text-2xl font-bold text-rose-400">{downMonitors}</div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-sm">
            <span className="text-xs font-medium text-zinc-400 block mb-1">Average Latency</span>
            <div className="text-2xl font-bold text-zinc-100">
              {avgLatency > 0 ? `${avgLatency} ms` : "—"}
            </div>
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
            Active Monitors ({websites.length})
          </h2>
        </div>

        {/* Loading Skeleton */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-zinc-900/30 border border-zinc-800/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : websites.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-zinc-800/80 bg-zinc-900/20">
            <div className="w-12 h-12 rounded-full bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center mx-auto mb-4 text-zinc-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-base font-medium text-zinc-200">No websites monitored yet</h3>
            <p className="text-sm text-zinc-400 mt-1 max-w-sm mx-auto">
              Add your first website to start tracking uptime and latency with background worker goroutines.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition-all shadow-lg shadow-emerald-500/20 inline-flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add Your First Monitor
            </button>
          </div>
        ) : (
          /* Website Cards */
          <div className="space-y-3">
            {websites.map((website) => {
              const ticks = website.ticks || [];
              const latestTick = ticks.length > 0 ? ticks[ticks.length - 1] : null;
              const isUp = latestTick ? latestTick.status === "up" : true;
              const currentLatency = latestTick ? latestTick.response_time_ms : null;

              return (
                <div
                  key={website.id}
                  className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                >
                  {/* Left: Status & URL */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className={`w-3 h-3 rounded-full shrink-0 ${
                        latestTick == null
                          ? "bg-zinc-500 animate-pulse"
                          : isUp
                          ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                          : "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                      }`}
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <a
                          href={website.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-sm text-zinc-100 hover:text-emerald-400 transition-colors truncate max-w-xs sm:max-w-md block"
                        >
                          {website.url}
                        </a>
                        <svg className="w-3.5 h-3.5 text-zinc-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>

                      <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                        <span>
                          {latestTick ? (
                            isUp ? (
                              <span className="text-emerald-400 font-medium">Online</span>
                            ) : (
                              <span className="text-rose-400 font-medium">Down</span>
                            )
                          ) : (
                            "Pending first ping..."
                          )}
                        </span>
                        {currentLatency !== null && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{currentLatency} ms</span>
                          </>
                        )}
                        <span>•</span>
                        <span>Checked every 5m</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Latency Sparkline & Actions */}
                  <div className="flex items-center justify-between md:justify-end gap-6">
                    {/* Latency History Bars */}
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">
                        Recent Pings ({ticks.length})
                      </span>
                      <div className="flex items-end gap-1 h-8 px-2 py-1 bg-zinc-950/60 border border-zinc-800/80 rounded-lg">
                        {ticks.length === 0 ? (
                          <span className="text-[10px] text-zinc-600 self-center">Awaiting ping</span>
                        ) : (
                          ticks.slice(-15).map((tick, idx) => {
                            // Calculate proportional height based on response time (min 6px, max 24px)
                            const h = tick.status === "up" ? Math.min(Math.max((tick.response_time_ms / 300) * 24, 6), 24) : 24;
                            return (
                              <div
                                key={tick.id || idx}
                                title={`${tick.status.toUpperCase()}: ${tick.response_time_ms}ms at ${new Date(
                                  tick.created_at
                                ).toLocaleTimeString()}`}
                                style={{ height: `${h}px` }}
                                className={`w-1.5 rounded-sm transition-all cursor-pointer ${
                                  tick.status === "up"
                                    ? "bg-emerald-400/80 hover:bg-emerald-300"
                                    : "bg-rose-500 hover:bg-rose-400"
                                }`}
                              />
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDelete(website.id)}
                      disabled={deletingId === website.id}
                      title="Delete Monitor"
                      className="p-2 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {deletingId === website.id ? (
                        <svg className="w-4 h-4 animate-spin text-rose-400" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Add Website Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-zinc-100">Add New Website Monitor</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setAddError("");
                }}
                className="text-zinc-500 hover:text-zinc-300 p-1 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {addError && (
              <div className="mb-4 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddWebsite} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Website URL
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://example.com"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 font-mono"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  We will ping this endpoint periodically and monitor response latency.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {adding ? "Adding..." : "Add Website"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
