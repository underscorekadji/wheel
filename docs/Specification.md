# Demo Wheel App – Specification **v1.0**

*(Frozen after clarifications on 01 Aug 2025)*

---

## 1  Goal

A lightweight Next .js web service that lets an **Organizer** spin an animated wheel to randomly select the next presenter and track their speaking time. **Guests** join via link, see the wheel and timer in real time, but cannot control them.

---

## 2  User Roles & Rights

| Role | Access | Capabilities |
|------|--------|--------------|
| **Organizer** | Creates a room, receives URL | • Add / disable / re‑enable participants <br>• Set speaking time (minutes) before every spin <br>• Start / stop wheel and timer |
| **Guest** | Opens URL, enters their name | • Read‑only view of wheel, participant list, timer |

Participant status lifecycle: **queued → active → finished**  (or **disabled** if excluded).

---

## 3  Key Flows

1. **Create room ▶ Invite**  
   • POST `/api/room` → `{ id }`; redirect to `/room/{id}`.  
   • Shows empty participant list, default time **10 min**.

2. **Join as guest**  
   • Enter name → joins list with status `queued`.

3. **Manage list** (Organizer)  
   • Add / disable / re‑enable names; updates broadcast in ≤ 500 ms.

4. **Spin wheel**  
   • Organizer clicks **Start**, sets minutes (spinner, default 10).  
   • Wheel animates 2 – 4 s, random sector chosen.  
   • Winner status → `active`, timer starts.

5. **Finish talk**  
   • On timer end **or** click **Mark as finished** → status `finished`; timer UI hides.  
   • Organizer may click **Next** when ≥ 1 `queued` remain.

6. **Session ends**  
   • When `queued` is empty → banner “Everyone presented”, button **New session** (clears state).

---

## 4  Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| **FR‑1** | Create unique room (crypto‑random UUID v4) | Must |
| **FR‑2** | Persist room state in **Redis** (TTL **8 h**) | Must |
| **FR‑3** | Real‑time sync via **Socket.IO** | Must |
| **FR‑4** | Guests supply non‑empty name before entering | Must |
| **FR‑5** | Wheel animation 60 fps, 2 – 4 s | Must |
| **FR‑6** | Uniform random sector selection | Must |
| **FR‑7** | Countdown timer in minutes (editable pre‑spin, default 10) | Must |
| **FR‑8** | Participant statuses broadcast to all clients | Must |
| **FR‑9** | Organizer can disable / re‑enable participants | Should |

---

## 5  Non‑Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Tech Stack** | Next .js 14 (App Router) + React 18 • **Socket.IO** for real‑time • **Redis 7** (TTL 8 h) • TypeScript |
| **Concurrency Model** | **Single server instance**; one Socket.IO namespace (= room) per session; no Redis Pub/Sub needed MVP. |
| **Deployment** | **docker‑compose**: services — Next.js, Redis, **Nginx** reverse proxy (HTTPS termination & basic rate‑limit). |
| **Performance** | First contentful paint ≤ 2 s; wheel animates 60 fps on desktop & tablet (≥ 768 px). |
| **Accessibility** | WCAG AA contrast; keyboard navigation; ARIA roles `spinbutton`, `timer`. |
| **Security** | Access by unguessable 128‑bit UUID in URL; HTTPS/WSS; Origin validation; no auth. |
| **Scalability** | Target ≤ 100 rooms × 30 users = 3 000 WS connections (single node). |
| **Room Lifetime** | Redis key expires 8 h after last mutation; room auto‑deletes thereafter. |

---

## 6  Pages & Routes

| Page | Purpose | Route |
|------|---------|-------|
| **Start Page** | Landing; buttons **Create new room** & **Join by UUID**. | `/` |
| **Organizer Room** | Full control UI: participant CRUD, wheel, timer. | `/room/{id}` (role = host via first visitor/cookie) |
| **Guest Room** | Read‑only wheel & timer; own name highlight. | `/room/{id}` after name entry (role = guest) |

---

## 7  User Stories (snapshot)

- **US‑01** – *Organizer creates a room* → unique URL; second browser sees same state.
- **US‑02** – *Guest joins* → enters name; appears to Organizer in ≤ 500 ms.
- **US‑03** – *Organizer edits list* → disable / re‑enable reflected live.
- **US‑04** – *Organizer spins wheel* → modal time picker; random winner; timer starts.
- **US‑05** – *Countdown* → accuracy ±1 s over 10 min; on 0:00 → status `finished`.

*Full backlog with acceptance criteria & story points stored separately.*

---

## 8  Decision Log (locked)

| Topic | Decision |
|-------|----------|
| Transport | **Socket.IO** |
| Instance Count | Single server (no horizontal scaling MVP) |
| Reconnect | Auto‑reconnect; role restored from cookie |
| Organizer Transfer | Not required |
| Wheel UI | Random colours; equal sector width |
| Timer Stop | Timer UI hides; value unchanged |
| Room TTL | Redis expiry 8 h |
| DevOps | docker‑compose: Next.js, Redis, Nginx |
| Kubernetes | Not planned |
| Wireframes | Skipped |
| Automated Tests | Out of scope |

---

## 9  Next Steps

1. Freeze spec v1.0 (this document).  
2. Build sprint backlog (Sprint 0: infra skeleton; Sprint 1: MVP flows).  
3. Begin implementation.
