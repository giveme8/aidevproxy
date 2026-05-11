# Claude Code Project Rules

You are working on AIDevProxy — a Tauri desktop proxy client for AI development environments.

## Mandatory Reading Before Changes

Before making any code changes, read:

1. `ENGINEERING-SOP.md`
2. Relevant files in `specs/`
3. Relevant ADRs in `docs/adr/`
4. `docs/adr/0003-tech-stack-baseline.md`
5. `design-html/styles/design-tokens.json`
6. Existing tests related to the task

## Required Workflow

For every task:

1. Restate the task.
2. Identify relevant files.
3. Output a short implementation plan.
4. List files you expect to modify.
5. List files you will not touch.
6. Make the smallest safe change.
7. Run quality checks.
8. Summarize changed files, commands, test results, screenshots, and risks.

## Planning Format

Before editing, output:

```md
## Implementation Plan

## Files I Will Modify

## Files I Will Not Touch

## Commands I Will Run

## Risks
```

## Quality Gate

After code changes, run:

```bash
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
```

Also run:

```bash
bash scripts/agent-guard.sh
```

If a command does not exist or cannot run in the current environment, report it clearly. Do not silently skip it.

## Visual Workflow

If the task changes UI:

1. Start the dev server (`npm run tauri dev` or `npm run dev`).
2. Capture screenshots.
3. Save screenshots under `screenshots/after/`.
4. Compare with `golden-screenshots/` whenever possible.
5. Ask for visual review feedback.
6. Apply feedback exactly.
7. Re-run the quality gate.

## Design Token Rule

Use existing design tokens first.

Preferred sources:

- `design-html/styles/design-tokens.json`
- `design-html/styles/tokens.css`

Do not invent new colors, shadows, radii, spacing, typography, or motion patterns unless necessary.

## Allowed Areas

Usually safe to modify:

- `src/pages/`
- `src/components/`
- `src/features/`
- `src/styles/`
- `src/__tests__/`
- `e2e/`
- `website/src/`
- `specs/`
- `prompts/`
- `docs/`

## Sensitive Areas

Ask for approval before modifying:

- `package.json`
- lockfiles
- `src-tauri/`
- `.github/workflows/`
- `website/wrangler.toml`
- `docs/release/`
- signing / notarization configuration

## Forbidden Actions

Do not:

- Delete unrelated files
- Rewrite the whole project
- Remove failing tests to make CI pass
- Skip tests without reporting
- Add dependencies without approval
- Modify lockfiles unnecessarily
- Modify secrets
- Print secrets
- Commit `.env` files
- Read private keys
- Modify release/signing/notarization workflows without approval
- Publish stable releases without approval

## Approval Required

Ask before:

- Adding a dependency
- Deleting files
- Changing package manager
- Modifying GitHub Actions release workflows
- Modifying Cloudflare production config
- Touching signing or notarization config
- Large refactors
- Running deployment commands
- Uploading builds

## Test Failure Rule

If tests fail:

1. Read the failure logs.
2. Explain the cause.
3. Fix the product code or the test expectation.
4. Never delete, skip, or weaken tests just to pass.

## Final Response Format

Always end with:

```md
## Changed Files

## Commands Run

## Test Results

## Screenshots

## Risks / Follow-ups
```

## Skills

When a task matches a reusable workflow, read the relevant skill first:

- Quality gate: `skills/quality-gate/SKILL.md`
- AI change guard: `skills/ai-change-guard/SKILL.md`
- GitHub PR / CI: `skills/github-pr-ci/SKILL.md`
- Tauri debugging: `skills/tauri-debug/SKILL.md`
- HTML to Tauri client: `skills/html-to-tauri-client/SKILL.md`
- UI visual review: `skills/ui-visual-review/SKILL.md`
- Cloudflare deploy: `skills/cloudflare-deploy/SKILL.md`

Skills do not override project rules. They provide task-specific procedures.
