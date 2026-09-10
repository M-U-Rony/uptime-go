# ⚡ UptimeGo

**High-Concurrency Distributed Website & API Uptime Monitor**  
*Engineered with Go (Golang), Next.js 16, Redis 7, PostgreSQL 16, and Docker.*

[![Go](https://img.shields.io/badge/Go-1.24+-00ADD8?style=flat&logo=go&logoColor=white)](https://golang.org)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js&logoColor=white)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat&logo=redis&logoColor=white)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com)
[![Turborepo](https://img.shields.io/badge/Turborepo-Monorepo-EF4444?style=flat&logo=turborepo&logoColor=white)](https://turbo.build)

---

## 🎯 Target & Overview

**UptimeGo** is a fullstack, distributed uptime and latency monitoring platform. It solves the performance limitations of traditional single-threaded monitoring probes by offloading health checks to a **concurrent Go Goroutine worker pool** decoupled through a **Redis queue**.

Capable of executing thousands of concurrent HTTP health checks with sub-second precision and minimal memory footprint (~2KB stack per worker), it persists granular latency ticks in PostgreSQL and visualizes them on a modern, real-time Next.js dashboard.

---

## 🗺️ System Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                 Next.js Frontend (Port 3000)                │
│         Realtime Status, Sparklines & Metric Cards          │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / CORS (HttpOnly Cookie JWT)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Go API Server (Port 8080)                   │
│         REST Endpoints, Auth Middleware, Context Injection  │
└──────────────┬───────────────────────────────┬──────────────┘
               │ Enqueues PingJob{ID, URL}     │ Queries / Inserts
               ▼                               ▼
     ┌──────────────────┐           ┌──────────────────────┐
     │  Redis 7 Queue   │           │    PostgreSQL 16     │
     │  (LPUSH / BRPOP) │           │ Users, Sites, Ticks  │
     └─────────┬────────┘           └──────────▲───────────┘
               │ Atomic Pop (BRPop)            │ Writes WebsiteTick
               ▼                               │ (latency ms, status)
┌──────────────────────────────────────────────┴──────────────┐
│             Go Worker Pool (Goroutines)                     │
│  Worker 1 (Goroutine)  Worker 2 (Goroutine)  Worker 3 ...   │
│  ├── Pings Target URL with 10s Timeout http.Client          │
│  └── Measures Latency (time.Since) & Records History Tick   │
└─────────────────────────────────────────────────────────────┘
```

---

## ✨ Core Engineering Highlights

- **Goroutine Worker Pool:** Replaced thread-heavy workers with lightweight Go goroutines. A pool of concurrent workers continuously consumes jobs from Redis without busy-waiting (`BRPOP`).
- **Zero-Read Queue Pipeline:** The scheduled Go producer (`time.Ticker`) serializes self-contained job payloads (`PingJob{ID, URL}`) directly into Redis, **eliminating redundant database read queries** during probe cycles.
- **XSS-Immune Authentication:** Implemented custom Go HTTP middleware extracting JWTs from **`HttpOnly` cookies**, with `Authorization: Bearer` fallback for CLI/Postman testing, and strict CORS credential handling.
- **Relational Time-Series Tick Storage:** Automatically migrates schemas via GORM, recording millisecond latency, response codes, and foreign key cascade deletion.
- **Modern Dashboard UI:** Built with Next.js 16 and Tailwind CSS, featuring active monitors, response time badges, interactive latency sparklines, and auto-refresh polling.
- **Multi-Stage Docker Containers:** Compiles Go into a statically linked, minimal production container (**<20MB** image size) running as an unprivileged user.

---

## 📁 Repository Structure

```text
uptime-go/
├── apps/
│   ├── backend/                  # Go Backend Service
│   │   ├── cmd/server/main.go    # HTTP Server & Worker Pool Entrypoint
│   │   ├── internal/
│   │   │   ├── config/           # JWT & Server Configurations
│   │   │   ├── database/         # PostgreSQL GORM Connection & Auto-migration
│   │   │   ├── handlers/         # Auth & Website CRUD Controllers
│   │   │   ├── middleware/       # Auth (Cookie/Bearer) & CORS Middleware
│   │   │   ├── models/           # User, Website, Region, WebsiteTick
│   │   │   ├── producer/         # Ticker-based Job Dispatcher (time.NewTicker)
│   │   │   ├── redis/            # Redis Connection & LPUSH / BRPOP Client
│   │   │   └── worker/           # Concurrency Worker Pool & HTTP Pinger
│   │   └── Dockerfile            # Multi-stage Go Alpine Build (< 20MB)
│   │
│   └── frontend/                 # Next.js 16 Dashboard
│       ├── app/
│       │   ├── dashboard/        # Live Monitoring Dashboard & Sparklines
│       │   ├── signin/           # User Login (HttpOnly Cookie Session)
│       │   ├── signup/           # User Registration
│       │   └── page.tsx          # Landing / Entry Router
│       └── Dockerfile            # Multi-stage Next.js Standalone Build
│
├── docker-compose.yml            # Fullstack Container Orchestration
├── turbo.json                    # Turborepo Monorepo Pipeline
└── package.json                  # Workspace Definitions
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Go 1.22+](https://golang.org/dl/)
- [Node.js 20+](https://nodejs.org/) or [Bun](https://bun.sh/)

---

### Step 1: Start Infrastructure (PostgreSQL & Redis)
From the repository root, start database and caching containers in the background:

```bash
docker compose up -d postgres redis
```

Verify services are healthy:
* **PostgreSQL:** Running on `localhost:5432` (`user: postgres`, `password: password123`, `db: uptime_db`)
* **Redis:** Running on `localhost:6379`

---

### Step 2: Run Backend & Frontend Concurrently

Using **Bun**:
```bash
bun dev
```

Or using **npm**:
```bash
npm run dev
```

Turborepo starts both services simultaneously:
- **Frontend Dashboard:** [http://localhost:3000](http://localhost:3000)
- **Go API Server:** [http://localhost:8080](http://localhost:8080)

---

## 🐳 Full-Stack Docker Deployment

You can run the **entire stack** (PostgreSQL, Redis, Go Backend, and Next.js Frontend) fully containerized with one command:

```bash
docker compose up --build -d
```

### Running Services

| Service | Container Name | Internal Port | Host Port | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend** | `uptime_frontend` | `3000` | `3000` | Next.js Dashboard UI |
| **Backend** | `uptime_backend` | `8080` | `8080` | Go REST API & Ping Worker Pool |
| **PostgreSQL** | `uptime_postgres` | `5432` | `5432` | Relational Storage (GORM) |
| **Redis** | `uptime_redis` | `6379` | `6379` | In-Memory Ping Queue |

To stop all services:
```bash
docker compose down
```

To view real-time logs:
```bash
docker compose logs -f backend
```

---

## 🔐 Environment Variables

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `DB_HOST` | `localhost` (`postgres` in Docker) | Hostname for PostgreSQL instance |
| `REDIS_ADDR` | `localhost:6379` (`redis:6379` in Docker) | Address for Redis connection |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | Backend API base URL consumed by Next.js |
| `JWT_SECRET` | `supersecretkey123` | Secret key used to sign and verify JWTs |

---

## 📡 API Reference

### Authentication
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Register new user account | No |
| `POST` | `/api/auth/signin` | Authenticate & set `HttpOnly` cookie | No |
| `POST` | `/api/auth/signout` | Clear `HttpOnly` auth cookie | Yes |

### Website Monitoring (CRUD)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/websites` | Add new URL to monitor | Yes |
| `GET` | `/api/websites` | List all monitors for logged-in user | Yes |
| `GET` | `/api/websites/{id}` | Get monitor details & latency tick history | Yes |
| `DELETE` | `/api/websites/{id}` | Remove monitor & cascade delete ticks | Yes |

---

## 📜 License

This project is licensed under the MIT License.
