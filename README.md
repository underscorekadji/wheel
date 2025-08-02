# Wheel - Presenter Selection App

[![CI/CD Pipeline](https://github.com/underscorekadji/wheel/actions/workflows/ci.yml/badge.svg)](https://github.com/underscorekadji/wheel/actions/workflows/ci.yml)

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
docker compose -f docker/dev/docker-compose.yml up -d
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
docker compose -f docker/dev/docker-compose.yml down
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

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
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

This project follows [Conventional Commits](https://conventionalcommits.org/) enforced by [Commitlint](https://commitlint.js.org/).

### Commit Message Format

All commit messages must follow the conventional commit format:

```
type(scope): subject
```

#### Commit Types

| Type       | Description                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------ |
| `feat`     | A new feature                                                                                          |
| `fix`      | A bug fix                                                                                              |
| `docs`     | Documentation only changes                                                                             |
| `style`    | Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc) |
| `refactor` | A code change that neither fixes a bug nor adds a feature                                              |
| `perf`     | A code change that improves performance                                                                |
| `test`     | Adding missing tests or correcting existing tests                                                      |
| `chore`    | Changes to the build process or auxiliary tools and libraries such as documentation generation         |
| `ci`       | Changes to our CI configuration files and scripts                                                      |
| `build`    | Changes that affect the build system or external dependencies                                          |
| `revert`   | Reverts a previous commit                                                                              |

#### Examples

```bash
feat(component): add new button variant
fix(api): resolve user authentication issue
docs(readme): update installation instructions
chore(deps): update next.js to latest version
style(format): fix indentation in components
test(wheel): add unit tests for spinner logic
ci(github): update workflow to use Node.js 20
refactor(hooks): simplify useRoomSocket implementation
```

#### Rules

- Type and subject are required
- Type must be lowercase
- Subject must be lowercase and not end with a period
- Scope is optional but recommended
- Use imperative mood in the subject (e.g., "add" not "adds" or "added")

### Pre-commit Hooks

This project uses [Husky](https://typicode.github.io/husky/) to run hooks that enforce code quality standards:

#### Pre-commit Hook

The following checks are automatically run before every commit:

- **Code Formatting**: `npm run format:check` - Ensures all files follow Prettier formatting rules
- **Linting**: `npm run lint` - Runs ESLint to check for code quality and potential issues
- **Type Checking**: `npm run type-check` - Validates TypeScript types across the project

#### Commit Message Hook

The commit message is validated to ensure it follows conventional commit format:

- **Commit Message Format**: Uses [Commitlint](https://commitlint.js.org/) to enforce conventional commit standards
- **Conventional Commits**: Ensures type, scope, and subject follow the required format

If any of these checks fail, the commit will be blocked until the issues are resolved.

#### Setting up Pre-commit Hooks

Pre-commit hooks are automatically installed when you run `npm install` (via the `prepare` script). If you need to manually reinstall them:

```bash
npm run prepare
```

#### Fixing Pre-commit Failures

If a commit is blocked due to pre-commit check failures:

1. **Formatting issues**: Run `npm run format` to auto-fix formatting
2. **Linting issues**: Run `npm run lint:fix` to auto-fix linting issues, or manually fix remaining issues
3. **Type errors**: Manually fix TypeScript type errors reported by `npm run type-check`

After fixing the issues, stage your changes and commit again.

## 📄 License

[MIT License](LICENSE)
