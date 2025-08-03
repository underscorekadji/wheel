# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Real-time spinning wheel app for presenter selection with **Next.js 15 (App Router) + Socket.IO + Redis**. Single-server architecture targeting 3,000 concurrent WebSocket connections across 100 rooms with 8-hour room TTL.

## Development Commands

### Essential Commands

- `npm run dev` - Start development server (Next.js with hot reload)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint checks
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run type-check` - TypeScript compilation check
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting without changes

### Testing Commands

- `npm test` - Run tests in watch mode (Vitest)
- `npm run test:run` - Run all tests once
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

### Pre-commit Quality Checks

Pre-commit hooks run automatically via Husky:

1. `npm run format:check` - Prettier formatting
2. `npm run lint` - ESLint code quality
3. `npm run type-check` - TypeScript validation

### Docker Development

- Local dev: `docker compose -f docker/dev/docker-compose.yml up -d`
- Production: `docker compose -f docker/prod/docker-compose.yml up -d --build`
- Test setup: `./docker/docker-test.sh`

## Architecture Overview

### Core Technologies

- **Framework**: Next.js 15 (App Router) with TypeScript
- **Real-time**: Socket.IO with room-based namespaces (`room:{id}`)
- **Persistence**: Redis with 8-hour TTL (28800 seconds)
- **Styling**: Tailwind CSS
- **Testing**: Vitest + jsdom + Testing Library
- **Quality**: ESLint + Prettier + Husky pre-commit hooks

### Key Routes & API Structure

```
/                         → Landing page (Create/Join forms)
/room/{id}                → Room page (role: Organizer vs Guest)
POST /api/room            → Room creation (crypto-random UUID v4)
/api/socket               → Socket.IO endpoint with HTTP upgrade
/api/health               → Health check endpoint
```

### Real-time Communication Pattern

- **Socket.IO Namespaces**: One namespace per room (`room:{roomId}`)
- **Role Persistence**: Organizer/Guest roles via cookies with auto-reconnect
- **State Broadcasting**: Room state changes broadcast to namespace within 500ms
- **Connection Handling**: Single Socket.IO server instance cached globally

### Data Layer Architecture

#### Redis Integration (`src/lib/redis.ts`)

- Room data stored with format: `room:{id}` → JSON serialized Room object
- Automatic 8-hour TTL with `SETEX` for atomic set-with-expiry
- Validation layer using Zod schemas on retrieval
- Connection pooling with error handling and retry logic

#### Type System (`src/types/`)

- **Room**: Core entity with participants, status, wheel config, selection history
- **Participant**: Lifecycle states: `queued → active → finished` (or `disabled`)
- **Socket**: Real-time event definitions and client/server message types
- Strict TypeScript with comprehensive interfaces for all entities

### Component & Hook Patterns

- Role-based UI switching: Organizer (full control) vs Guest (read-only)
- Custom `useRoomSocket` hook planned for real-time state sync
- Participant management with status lifecycle enforcement
- Wheel animation targeting 60fps with 2-4 second spin duration

### Performance & Scalability Targets

- First contentful paint ≤ 2 seconds
- Support 3,000 concurrent WebSocket connections (100 rooms × 30 users)
- Wheel animation at 60fps on desktop/tablet (≥768px)
- Real-time state sync within 500ms latency requirement

## File Structure & Conventions

### Source Organization

```
src/
├── app/                  # Next.js App Router pages & API routes
│   ├── api/             # API endpoints (room, socket, health)
│   └── page.tsx         # Landing page component
├── lib/                 # Utility libraries & services
│   ├── redis.ts         # Redis helper layer with TTL management
│   ├── socket-*.ts      # Socket.IO server/client utilities
│   └── validation.ts    # Zod schema validation
└── types/               # TypeScript definitions
    ├── room.ts          # Room & WheelConfig interfaces
    ├── participant.ts   # Participant states & lifecycle
    └── socket.ts        # Real-time event definitions
```

### Testing Strategy

- Test files co-located: `__tests__/` directories alongside source
- Vitest with jsdom environment for React components
- Setup file: `src/__tests__/setup.ts` with Testing Library configuration
- Path alias: `@/` points to `src/` for clean imports

### Code Quality Standards

- **Commitlint**: Conventional commits enforced (`feat:`, `fix:`, etc.)
- **ESLint**: Next.js + TypeScript rules with Prettier integration
- **Type Safety**: Strict TypeScript with comprehensive interfaces
- **Error Handling**: Detailed error messages with proper error types

## Key Implementation Notes

### Room Management

- Crypto-random UUID v4 for room IDs (128-bit security)
- Redis TTL automatically handles cleanup after 8 hours
- Room status lifecycle: `waiting → active → paused → completed → expired`
- Organizer role assigned to first visitor, persisted via cookies

### Socket.IO Integration

- Server instance cached in global variable to prevent multiple servers
- Room-based namespaces for efficient message broadcasting
- Automatic reconnection with role restoration from cookies
- No Redis Pub/Sub needed for MVP (single server architecture)

### Participant Lifecycle

- Status progression: `queued → active → finished` (or `disabled`)
- Selection history tracking with timestamp and spin duration
- Support for excluding finished participants from future spins
- Wheel config allows repeat selections toggle

## Documentation References

- Project specification: `docs/Specification.md` (frozen v1.0)
- Docker setup: `docker/README.md` with development/production configs
- Backlog & user stories: `docs/Backlog.md`
- GitHub Copilot instructions: `.github/copilot-instructions.md`
