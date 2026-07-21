# 433 Football Stream

A full-stack football streaming discovery project with a Node.js backend proxy/cache service and an Expo React Native mobile app.

## Overview

This repository contains two main workspaces:

- `backend/` - Express + TypeScript service that fetches football match stream metadata from an external API, validates available stream servers, caches results in Redis, and exposes a lightweight API.
- `mobile-app/` - Expo-based React Native app that consumes the backend API, displays live/upcoming matches, allows league filtering, schedules local notifications, and streams available channels.

---

## Backend

### Purpose
The backend retrieves football match data from an external streaming API and handles:

- **API key rotation & rate-limit resilience:** Dynamically swaps and blacklists rate-limited (429) keys.
- **Cache-first dataset merging:** Merges verified live stream channels into active cached matches while purging stale matches older than 2.5 hours.
- **Stream endpoint validation:** Proactively verifies stream channels before serving data to clients.
- **Flat background polling engine:** Schedules regular background cache updates based on API key availability.

### Backend Scheduling Architecture

The backend utilizes an adaptive interval background polling model based on current API key capacity:

- **Key Capacity Detection:**
  - `> 3 active keys`: Runs every **30 minutes**.
  - `2 to 3 active keys`: Runs every **45 minutes**.
  - `≤ 1 active key`: Runs every **60 minutes** (conserves remaining quota).
- **Startup Warmup:** Triggers an immediate cache synchronization check upon server launch.

### Key Folders

- `src/config` - environment loading, Redis connection, logger setup
- `src/services` - external API fetching, stream verification, API key rotation
- `src/controllers` - API controller for match data retrieval
- `src/routes` - Express route definitions
- `src/jobs` - background polling and cron schedule logic
- `src/utils` - helper functions such as stream verification

### Startup

Required environment variables (`.env` in `backend/`):

- `PORT` - port for the API server (e.g., `5000`)
- `REDIS_URL` - connection string for Redis (e.g., `redis://localhost:6379`)
- `FOOTBALL_API_KEYS` - comma-separated list of RapidAPI keys for key rotation
- `NODE_ENV` - environment mode (`development` | `production`)

Install dependencies and start:

```bash
cd backend
npm install
npm run dev
```

---

## Mobile App

### Purpose
The mobile app is an Expo React Native client that:

- Loads football match data from the backend.
- Renders live and upcoming matches with league filters.
- Manages scheduled local notifications for match kickoffs.
- Plays selected stream channels using an embedded video player.
- Dynamically configures package bundle identifiers based on the target `EAS_BUILD_PROFILE`.

### Key Folders

- `app/` - Expo Router screens and layout
- `context/` - shared match data provider and notification handling
- `components/` - dashboard UI, match cards, channel selector, video player
- `config/` - API base URL and retry utilities
- `utils/` - notification scheduling and validation helpers

### Local Development Startup

Install dependencies and start Expo:

```bash
cd mobile-app
npm install
npm run start
```

---

## Automated Mobile Builds (EAS + GitHub Actions)

Mobile client builds are fully automated via GitHub Actions (`.github/workflows/mobile-build.yml`) and **EAS Build** (Expo Application Services).

### Important Environment Variable Requirement

> ⚠️ **CRITICAL:** `EXPO_PUBLIC_API_BASE_URL` **MUST** be set directly inside your project settings on [expo.dev](https://expo.dev) under **Project Settings > Environment Variables** (or defined in `eas.json` under your build profiles).
> 
> Because Expo bakes `EXPO_PUBLIC_` variables directly into the compiled JavaScript bundle at build time, setting this variable on Expo's cloud dashboard ensures that production, preview, and development binaries hit their respective backend API endpoints.

---

### EAS Build Execution Flow

```text
Git Tag Push / Manual Trigger
            │
            ▼
GitHub Actions Workflow Triggered
            │
            ▼
Resolves last commit affecting mobile-app/ directory
            │
            ▼
Determines EAS Profile (production / preview / development)
            │
            ▼
EAS Duplicate Build Check (Prevents re-building identical mobile commits)
            │
            ▼
Triggers Remote EAS Cloud Android Build
```

1. **Target Commit Isolation:** The pipeline inspects `git log` specifically for the `mobile-app/` subdirectory. If a release tag is pushed after backend-only changes, it builds against the last actual mobile codebase state.
2. **Profile Mapping:** The pipeline maps Git ref tags directly to `eas.json` profiles and app configurations:
   - `prod-*` tags ➔ `production` profile (`com.anonymous.footballstreamapp`)
   - `preview-*` tags ➔ `preview` profile (`com.anonymous.footballstreamapp.preview`)
   - `dev-*` tags ➔ `development` profile (`com.anonymous.footballstreamapp.dev`)
3. **Duplicate Prevention:** Before running `eas build`, the workflow queries the Expo API. If an EAS build for the resolved target SHA and build profile already exists, the step safely rejects duplicate builds to save build minutes.

---

### How to Trigger Mobile Builds

#### Option 1: Git Tags (Recommended)
Push a git tag matching the target profile prefix to automatically trigger an EAS build:

```bash
# Trigger a Development Build
git tag dev-0
git push origin dev-0

# Trigger a Preview Build
git tag preview-0
git push origin preview-0

# Trigger a Production Build
git tag prod-0
git push origin prod-0
```

#### Option 2: Manual Trigger (`workflow_dispatch`)
1. Go to your GitHub Repository ➔ **Actions**.
2. Select the **EAS Mobile Build** workflow.
3. Click **Run workflow**, choose your branch, and select your target EAS profile (`development`, `preview`, or `production`) from the dropdown.

---

## Prerequisites for CI/CD

To ensure the GitHub Actions workflow runs without authentication issues:

1. Generate an **Expo Access Token** on [expo.dev](https://expo.dev) under Account Settings > Access Tokens.
2. Add the token to your GitHub repository secrets under `EXPO_TOKEN` (**Settings > Secrets and variables > Actions**).

---

## Notes

- Ensure the backend is reachable by the mobile app (use local network IP for emulators or physical devices in development).
- Keep your RapidAPI keys safe in backend environment variables and provide multiple keys to leverage auto-rotation.
- Development, Preview, and Production builds use distinct Android bundle package names, meaning all three build variants can be installed side-by-side on the same Android test device without overwriting each other.