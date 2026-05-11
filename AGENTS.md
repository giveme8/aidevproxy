# AGENTS.md

This file defines instructions for Codex and other repository-aware coding agents.

## Setup

```bash
npm install
```

## Development

```bash
npm run tauri dev
```

Frontend-only:

```bash
npm run dev
```

## Quality Gate

Run after every code change:

```bash
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
bash scripts/agent-guard.sh
```

## Mandatory Reading

Before editing code, read:

- `ENGINEERING-SOP.md`
- Relevant files in `specs/`
- Relevant ADR files in `docs/adr/`
- `docs/adr/0003-tech-stack-baseline.md`
- `design-html/styles/design-tokens.json`
- Related tests

## Agent Role

The local coding agent implements code, runs tests, debugs, and captures screenshots.

The local coding agent must not make final visual judgments.

## Visual Review Process

If you change UI:

1. Generate screenshots.
2. Save them to `screenshots/after/`.
3. Ask for visual review.
4. Apply feedback.
5. Run the quality gate again.

## Design Token Rule

Use design tokens first.

Do not invent new colors, shadows, radii, spacing, or typography unless the task explicitly requires it.

## Forbidden Actions

Do not:

- Delete unrelated files
- Rewrite the whole project
- Remove or skip failing tests
- Add dependencies without approval
- Modify lockfiles unnecessarily
- Read or print secrets
- Commit `.env` files
- Modify production deployment config without approval
- Modify signing / notarization config without approval
- Publish stable releases

## Approval Required

Ask before:

- Adding dependencies
- Deleting files
- Changing package manager
- Editing `.github/workflows`
- Editing `src-tauri`
- Editing Cloudflare production config
- Running deployment commands
- Uploading builds
- Large refactors

## Final Output Format

```md
## Changed Files

## Commands Run

## Test Results

## Screenshots

## Risks / Follow-ups
```
