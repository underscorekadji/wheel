# Demo Wheel App – Backlog v1.0

*(Waterfall, single‑developer, GitHub Issues)*

---

### Conventions

- **Labels**: `infra`, `backend`, `frontend`, `socket`, `ci`, `docs`, `accessibility`, `enhancement`, `bug`  
- **Size**: *S* ≤ 2 h, *M* ≈ ½ day, *L* ≈ 1–2 days, *XL* > 2 days
- **Definition of Done** for every issue: PR reviewed & merged, GitHub Actions pipeline passes (**lint → build → smoke**).

---

## Milestone 0 – Infrastructure & CI

| # | Issue | Labels | Size |
|---|-------|--------|------|
| 0.1 | Bootstrap Next.js 14 (App Router) repo w/ TypeScript config | infra | S |
| 0.2 | Add ESLint + Prettier configs & lint script | infra, ci | S |
| 0.3 | Compose **docker‑compose.yml** (services: app, redis, nginx) | infra, docker | M |
| 0.4 | Nginx conf for HTTPS (self‑signed) + WS proxy + basic rate‑limit | infra, nginx | M |
| 0.5 | GitHub Actions: install → lint → build → docker build → smoke `curl /api/health` | ci | M |
| 0.6 | README: local dev, Docker setup, CI badge | docs | S |

## Milestone 1 – Backend Core

| # | Issue | Labels | Size |
|---|-------|--------|------|
| 1.1 | Define TypeScript types for Room & Participant | backend | S |
| 1.2 | REST endpoint `POST /api/room` (create room, UUID v4) | backend | M |
| 1.3 | Redis helper layer (set/get with TTL 8 h) | backend, redis | S |
| 1.4 | **Socket.IO** server setup; namespace `room:{id}` | backend, socket | M |
| 1.5 | Broadcast room state diff to namespace clients | backend, socket | M |
| 1.6 | Auto‑cleanup: Redis key expiration job  | backend, redis | S |

## Milestone 2 – Frontend Skeleton (MVP)

| # | Issue | Labels | Size |
|---|-------|--------|------|
| 2.1 | **Start Page** `/` – layout, Create / Join forms | frontend | S |
| 2.2 | **Room Layout** (Organizer / Guest switch via cookie) | frontend | M |
| 2.3 | Socket.IO client hook (`useRoomSocket`) + reconnect | frontend, socket | M |
| 2.4 | Participant list CRUD (Organizer) + live view (Guest) | frontend | M |
| 2.5 | Placeholder Wheel component (static SVG sectors) | frontend | M |
| 2.6 | Basic Timer component (minutes countdown) | frontend | M |

## Milestone 3 – Wheel & Timing Logic

| # | Issue | Labels | Size |
|---|-------|--------|------|
| 3.1 | Random sector calculation (uniform) | frontend | S |
| 3.2 | SVG / Canvas wheel animation 60 fps, 2–4 s | frontend, enhancement | L |
| 3.3 | Random colour assignment per sector | frontend | S |
| 3.4 | Timer integration with wheel result (`active` → start) | frontend | M |
| 3.5 | "Mark as finished" button → status change broadcast | frontend, socket | S |

## Milestone 4 – UX Polish & NFRs

| # | Issue | Labels | Size |
|---|-------|--------|------|
| 4.1 | Accessibility: ARIA roles, keyboard focus ring | accessibility | S |
| 4.2 | Responsive tweaks (>= 768 px tablet) | frontend | S |
| 4.3 | Origin check middleware & UUID validation | backend, security | S |
| 4.4 | README update for deployment, env vars | docs | S |

## Milestone 5 – Release

| # | Issue | Labels | Size |
|---|-------|--------|------|
| 5.1 | Version bump `v1.0.0`, create Git tag | release | S |
| 5.2 | Draft GitHub Release (notes, changelog) | docs, release | S |
| 5.3 | Announcement post (optional) | docs | S |

---

### Total Estimates (rough)

- Milestone 0: **~3 days**
- Milestone 1: **~2 days**
- Milestone 2: **~3 days**
- Milestone 3: **~3 days**
- Milestone 4: **~1 day**
- Milestone 5: **~½ day**

*≈ 13 — 14 dev‑days total for single developer.*

---

### Next Action

1. Create GitHub repo & push baseline (Milestone 0‑issues 0.1‑0.2).  
2. Add remaining issues with labels & milestones exactly as above (GitHub UI or `gh issue create`).
