# Wheel - Presenter Selection App

[![PR Checks](https://github.com/underscorekadji/wheel/actions/workflows/pr-checks.yml/badge.svg)](https://github.com/underscorekadji/wheel/actions/workflows/pr-checks.yml)
[![Main Deploy](https://github.com/underscorekadji/wheel/actions/workflows/main-deploy.yml/badge.svg)](https://github.com/underscorekadji/wheel/actions/workflows/main-deploy.yml)

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

For local development with hot reload:

1. Clone the repository:

```bash
git clone https://github.com/underscorekadji/wheel.git
cd wheel
```

2. Start development services:

```bash
npm run docker
```

3. Access the application:
   - **Via Nginx (recommended)**: [http://localhost](http://localhost)
   - **Direct app access**: [http://localhost:3000](http://localhost:3000)

4. View logs:

```bash
docker compose -f docker/dev/docker-compose.yml logs -f
```

5. Stop services:

```bash
npm run docker:down
```

### Docker Production

For production deployment:

1. Build and start production services:

```bash
docker compose -f docker/prod/docker-compose.yml up -d --build
```

2. Access the application at [http://localhost](http://localhost)

3. Stop production services:

```bash
docker compose -f docker/prod/docker-compose.yml down
```

### Docker Test Helper

Use the test script to quickly validate your Docker setup:

```bash
./docker/docker-test.sh
```

### Docker Services

- **app**: Next.js server (development: hot reload server, production: standalone server)
- **redis**: Redis server with persistence (port 6379)
- **nginx**: Reverse proxy with compression and security headers (port 80)

## 📝 Available Scripts

### Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server

### Code Quality

- `npm run format` - Format code with Prettier
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run type-check` - Check TypeScript types
- `npm run check` - Run all quality checks (format + lint + type-check)

### Testing

- `npm run test` - Run tests in watch mode
- `npm run test:run` - Run tests once
- `npm run test:coverage` - Run tests with coverage

### Docker & CI

- `npm run docker` - Start development Docker services
- `npm run docker:down` - Stop development Docker services
- `npm run verify` - Run full CI pipeline locally (check + test + build)
- `npm run clean` - Clean build artifacts and caches

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

This project follows [Conventional Commits](https://conventionalcommits.org/) enforced by [Commitlint](https://commitlint.js.org/).

Example commit message: `feat(component): add new button variant`

### Pre-commit Hooks

This project uses [Husky](https://typicode.github.io/husky/) to run pre-commit hooks that enforce code quality standards. The following checks are automatically run before every commit:

- **Code Formatting**: `npm run format:check` - Ensures all files follow Prettier formatting rules
- **Linting**: `npm run lint` - Runs ESLint to check for code quality and potential issues
- **Type Checking**: `npm run type-check` - Validates TypeScript types across the project

If any of these checks fail, the commit will be blocked until the issues are resolved.

#### Setting up Pre-commit Hooks

Pre-commit hooks are automatically installed when you run `npm install` (via the `prepare` script). If you need to manually reinstall them:

```bash
npm run prepare
```

#### Fixing Pre-commit Failures

If a commit is blocked due to pre-commit check failures:

1. **Quick fix**: `npm run format && npm run lint:fix`
2. **Check all issues**: `npm run check`
3. **Type errors**: Fix TypeScript errors manually

**💡 Pro tip**: Run `npm run verify` before pushing to ensure your changes pass all CI checks locally.

After fixing the issues, stage your changes and commit again.

## 📄 License

[MIT License](LICENSE)
