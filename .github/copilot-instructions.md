# GitHub Copilot Instructions

## Documentation First

**Always start by reading the project documentation:**
- First, read the contents of the `docs/` folder, especially `docs/Specification.md`
- This contains the specification with all requirements, user stories, and technical decisions
- Use this as the source of truth for all implementation decisions

## Project Overview

Real-time spinning wheel app for presenter selection with **Next.js 15 (App Router) + Socket.IO + Redis**. Single-server architecture targeting 3,000 concurrent WebSocket connections across 100 rooms.

## Architecture Patterns

### Real-time Communication

- Socket.IO with **room-based namespaces**: `room:{id}` pattern
- Auto-reconnect with role persistence via cookies (Organizer vs Guest)
- Broadcast state diffs to namespace clients within 500ms requirement
- No Redis Pub/Sub needed for MVP (single server instance)

### Data Layer

- **Redis TTL**: 8-hour room expiration with auto-cleanup jobs
- Crypto-random UUID v4 for room IDs (128-bit security)
- Participant lifecycle: `queued → active → finished` (or `disabled`)

### Frontend Patterns

- Role-based UI switching: Organizer (full control) vs Guest (read-only)
- Real-time sync via custom `useRoomSocket` hook with reconnection
- Performance target: 60fps wheel animation, ≤2s first contentful paint

## Key Routes & Components

```
/                    → Start page (Create/Join forms)
/room/{id}           → Room page (role detected via cookie)
POST /api/room       → Room creation endpoint
```

## Commit Message Guidelines (Commitlint)

- All commit messages must follow the [Commitlint](https://commitlint.js.org/#/concepts-commit-conventions) rules for conventional commits.
- Example: `feat(component): add new button variant`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, etc.
- Scope is optional but recommended.
- Subject should be concise and imperative.
