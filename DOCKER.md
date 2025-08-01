# Docker Quick Reference

## Development

```bash
# Start development environment
docker compose -f docker/dev/docker-compose.yml up -d

# View logs
docker compose -f docker/dev/docker-compose.yml logs -f

# Stop
docker compose -f docker/dev/docker-compose.yml down
```

## Production

```bash
# Start production environment
docker compose -f docker/prod/docker-compose.yml up -d --build

# View logs
docker compose -f docker/prod/docker-compose.yml logs -f

# Stop
docker compose -f docker/prod/docker-compose.yml down
```

## Test Setup

```bash
./docker/docker-test.sh
```

For detailed documentation, see [docker/README.md](docker/README.md)
