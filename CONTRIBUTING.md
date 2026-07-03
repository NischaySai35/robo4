# Contributing to TETROBOT

Thanks for your interest! A quick note first:

> **TETROBOT is proprietary software** (see [LICENSE](LICENSE)). The source is not
> open for public reuse or redistribution. Contributions are accepted **only from
> authorized collaborators** who have written permission from the author. By
> submitting a contribution you agree it may be used by the author without
> restriction and becomes part of the proprietary work.

If that's you, here's how to work in this repo cleanly.

## Prerequisites

- **Node.js 18+** and npm
- (optional) Python 3.10+ for the backend stub
- (optional) Arduino IDE / PlatformIO for the ESP32 firmware

## Setup

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

## Before you push — the checklist

- [ ] `npm run typecheck` passes (strict TypeScript, no `@ts-nocheck`)
- [ ] `npm run build` succeeds
- [ ] `npm run lint` is clean (if configured)
- [ ] No secrets, API keys, or personal `.nischay` files committed
- [ ] New behavior is described in the PR and, if user-facing, added to `CHANGELOG.md`

## Branch & commit conventions

- Branch off `main`: `feat/…`, `fix/…`, `chore/…`, `docs/…`
- Keep commits focused; write a clear imperative subject
  (e.g. `fix: keyed connector snaps to nearest 90°`)
- Prefer [Conventional Commits](https://www.conventionalcommits.org/) prefixes:
  `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `chore`

## Code style

- **100% TypeScript, strict mode** — no `any` where a real type fits.
- Match the surrounding file's conventions (naming, comment density, idioms).
- One source of truth: the model **document** (`core/model`). Views (viewport,
  physics, analysis, animation, hardware) read it; the backend never mutates it.
- Keep UI logic out of the kinematics/analysis modules and vice-versa.

## Reporting bugs / requesting features

Use the GitHub issue templates. For security issues, follow
[SECURITY.md](SECURITY.md) instead — do **not** open a public issue.

## Architecture

See [`README.md`](README.md), [`frontend/ARCHITECTURE.md`](frontend/ARCHITECTURE.md),
and the roadmaps for how the pieces fit together.
