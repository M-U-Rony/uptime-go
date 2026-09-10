# Uptime Clone in Go — Action Plan & Learning Roadmap

This roadmap breaks down rebuilding the full uptime monitoring system using **Go** for the backend and **Next.js** for the frontend inside your Turborepo. Each task focuses on both **learning the Go concept** (mapped from MERN) and **implementing the feature**.

---

## 🗺️ High-Level System Architecture

```text
[ Next.js Frontend (Port 3000) ]
              │ HTTP (JSON + JWT)
              ▼
[ Go API Server (Port 8080) ] ─── queries/inserts ───► [ PostgreSQL ]
              │                                              ▲
       enqueues ping jobs                                    │ saves ping results
              ▼                                              │ (status, latency ms)
         [ Redis ] ◄─── consumes jobs ─── [ Go Worker (Goroutines) ]
```

## Phase 5: Redis & The Background Worker (Go's Superpower)
> **Goal:** Build the producer and high-concurrency worker pipeline. *(Why Go shines: Goroutines handle thousands of concurrent pings with minimal RAM).*

- [ ] **5.2 The Producer Service (Ticker / Cron)**
  - Learn: `time.NewTicker` in Go.
  - Periodically fetch all active websites from DB and push ping jobs to Redis.
- [ ] **5.3 The Worker Pool (Goroutines & HTTP Client)**
  - Learn: Goroutines, `sync.WaitGroup`, and worker pool pattern.
  - Worker pops jobs from Redis.
  - Uses `http.Client` with custom timeouts to ping URLs and measure latency (`time.Since`).
  - Writes `WebsiteTick` results directly back to PostgreSQL.

---

## Phase 6: Next.js Frontend Integration
> **Goal:** Connect your Next.js dashboard inside `apps/frontend` to the Go backend.

- [ ] **6.1 Setup API Client**
  - Create centralized fetch wrapper with JWT token handling in Next.js.
- [ ] **6.2 Auth Pages**
  - Sign in and Sign up forms.
- [ ] **6.3 Dashboard & Realtime Status**
  - Add website modal (URL input).
  - Status cards (Up/Down indicators, response time badges).
  - Latency sparkline / chart per website.

---

## Phase 7: Production Polish & Interview Talking Points
> **Goal:** Topics and optimizations interviewers look for in Go candidates.

- [ ] **7.1 Structured Logging**
  - Use Go's standard `log/slog` for structured JSON logs.
- [ ] **7.2 Graceful Shutdown**
  - Listen for OS signals (`SIGINT`, `SIGTERM`) and gracefully drain HTTP connections and workers.
- [ ] **7.3 Minimal Multi-Stage Dockerfile**
  - Build a tiny standalone binary image (< 20MB) using Go scratch or Alpine.
