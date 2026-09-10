"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function HomePage() {
  const router = useRouter();

  // Try checking if user is already logged in
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("http://localhost:8080/api/websites", {
          credentials: "include",
        });
        if (res.ok) {
          router.push("/dashboard");
        }
      } catch (e) {
        // Not authenticated or backend offline
      }
    }
    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#090d16] text-zinc-100 flex flex-col justify-between antialiased relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="max-w-6xl w-full mx-auto px-6 h-20 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <span className="text-xl font-bold tracking-tight text-zinc-100">UptimeGo</span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/signin"
            className="px-4 py-2 text-sm text-zinc-300 hover:text-zinc-100 font-medium transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 text-sm bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold rounded-xl transition-all shadow-md shadow-emerald-500/20"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-6 py-16 text-center z-10 flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-400 mb-8 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>High-Concurrency Go Engine with Redis Queue</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.15] bg-gradient-to-b from-zinc-100 via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
          Sub-second uptime monitoring for modern APIs.
        </h1>

        <p className="mt-6 text-lg text-zinc-400 max-w-2xl leading-relaxed">
          Powered by Go goroutine worker pools and distributed Redis queues. Measure latencies, track uptime health, and never miss a downtime incident.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/dashboard"
            className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm rounded-xl transition-all shadow-xl shadow-emerald-500/25 flex items-center gap-2"
          >
            Open Dashboard
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
          <Link
            href="/signup"
            className="px-6 py-3.5 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-medium text-sm rounded-xl transition-all backdrop-blur-md"
          >
            Create Free Account
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto px-6 py-8 border-t border-zinc-900 text-center text-xs text-zinc-600 z-10">
        UptimeGo — Built with Go, Next.js, PostgreSQL, and Redis.
      </footer>
    </div>
  );
}
