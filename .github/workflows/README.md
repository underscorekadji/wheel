# CI/CD Pipeline Architecture

## Overview

This project uses a **trunk-based development** approach with three separate CI/CD workflows optimized for different stages of the development lifecycle.

## Workflow Structure

### 1. 🚀 **PR Check** (`.github/workflows/pr-check.yml`)

**Triggers:** Pull Requests to `main`  
**Duration:** ~2-3 minutes  
**Purpose:** Fast feedback for developers

**Jobs:**
- `lint-and-typecheck` - Code quality checks
- `build-verification` - Ensures code compiles

**Benefits:**
- ⚡ Fast PR cycles 
- 🔄 Quick developer feedback
- 💰 Resource efficient

### 2. 🔍 **Main CI** (`.github/workflows/main-ci.yml`)

**Triggers:** Push to `main` branch  
**Duration:** ~5-7 minutes  
**Purpose:** Comprehensive validation after merge

**Jobs:**
- `quality-gates` - Full lint, type-check, format validation
- `build` - Complete application build with artifacts
- `basic-validation` - Security audit, structure validation

**Artifacts:**
- Build artifacts stored for 7 days
- Named with commit hash for traceability

### 3. 🚢 **Release Pipeline** (`.github/workflows/release.yml`)

**Triggers:** Git tags matching `v*` pattern (e.g., `v1.0.0`)  
**Duration:** ~10-15 minutes  
**Purpose:** Production-ready releases

**Jobs:**
- `prepare-release` - Version extraction and validation
- `build-and-test` - Full quality gates + release build
- `docker-build` - Multi-tag Docker image build and registry push
- `smoke-test` - Comprehensive health checks and performance baseline
- `release-summary` - Status report and next steps

**Features:**
- 🐳 Docker images pushed to GitHub Container Registry
- 🏥 Full health check validation
- 📊 Performance baseline testing
- 🏷️ Semantic versioning support
- 📦 Long-term artifact retention (30 days)

## Migration from Old CI

The previous monolithic CI (`ci.yml.backup`) ran all stages on every PR, which was:
- 🐌 Slow (7-10 minutes per PR)
- 💰 Resource intensive 
- 🔄 Poor developer experience

## Usage

### For Development
1. **Create PR** → `pr-check.yml` runs automatically
2. **Merge to main** → `main-ci.yml` runs automatically  
3. **Create release tag** → `release.yml` runs automatically

### Creating Releases
```bash
# Create and push a release tag
git tag v1.0.0
git push origin v1.0.0
```

Or use GitHub Releases UI to create tags.

### Manual Release
You can also trigger releases manually via GitHub Actions UI with custom version input.

## Artifact Flow

```
PR Check (fast validation)
    ↓
Main CI (full build + artifacts)
    ↓  
Release (Docker + production validation)
```

## Container Registry

Docker images are pushed to: `ghcr.io/underscorekadji/wheel`

**Available tags:**
- `v1.0.0` - Specific version
- `1.0` - Major.minor
- `1` - Major version  
- `latest` - Latest release

## Performance Targets

- **PR Check:** < 3 minutes
- **Main CI:** < 7 minutes  
- **Release:** < 15 minutes
- **Health Check Response:** < 1000ms

## Security

- 🔒 Minimal permissions per workflow
- 🔐 Secrets only in release pipeline
- 📦 Registry access controlled by GitHub tokens
- 🛡️ Dependency vulnerability scanning

## Monitoring

Each workflow provides detailed logging and status reporting. Failed builds include:
- Container logs
- Step-by-step debugging info
- Performance metrics
- Security scan results
