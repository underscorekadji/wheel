# Wheel - Presenter Selection App

Real-time spinning wheel app for presenter selection with **Next.js 15 (App Router) + Socket.IO + Redis**.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Docker and Docker Compose (for containerized development)

### Local Development (Node.js)

1. Clone the repository:

```bash
git clone https://github.com/underscorekadji/wheel.git
cd wheel
```

2. Install dependencies:

```bash
npm install
```

3. Create environment file:

```bash
cp .env.example .env.local
```

4. Start the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Docker Development

1. Clone the repository:

```bash
git clone https://github.com/underscorekadji/wheel.git
cd wheel
```

2. Start with Docker Compose:

```bash
docker compose up -d
```

3. Access the application:
   - **Via Nginx (recommended)**: [http://localhost](http://localhost)
   - **Direct app access**: [http://localhost:3000](http://localhost:3000)

4. View logs:

```bash
docker compose logs -f
```

5. Stop services:

```bash
docker compose down
```

### Docker Services

- **app**: Next.js development server (port 3000)
- **redis**: Redis server with persistence (port 6379)
- **nginx**: Reverse proxy with compression and security headers (port 80)

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run type-check` - Check TypeScript types

## 🏗️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Linting**: ESLint + TypeScript ESLint
- **Real-time**: Socket.IO (planned)
- **Database**: Redis (planned)

## 📚 Architecture

### Routes

- `/` → Start page (Create/Join forms)
- `/room/{id}` → Room page (role detected via cookie)
- `POST /api/room` → Room creation endpoint

### Key Features (Planned)

- Role-based UI switching: Organizer (full control) vs Guest (read-only)
- Real-time sync via custom `useRoomSocket` hook
- 60fps wheel animation, ≤2s first contentful paint
- Support for 3,000 concurrent WebSocket connections across 100 rooms

## 🤝 Contributing

This project follows [Conventional Commits](https://conventionalcommits.org/).

Example commit message: `feat(component): add new button variant`

## 📄 License

[MIT License](LICENSE)
