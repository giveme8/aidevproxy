<!--
GENERATED FILE. DO NOT EDIT DIRECTLY.

Source: skills/quality-gate/SKILL.md

Regenerate with:

  python scripts/init-agent-skills.py
-->

---
name: quality-gate
description: "Use this skill after every code change. The quality gate prevents broken code, skipped tests, dependency drift, and unsafe AI changes from entering the project."
---

# Quality Gate Skill

## Purpose

Use this skill after every code change.

The quality gate prevents broken code, skipped tests, dependency drift, and unsafe AI changes from entering the project.

## When to Use

Use this skill after:

- Any source code change
- Any UI change
- Any test change
- Any configuration change
- Before PR creation
- Before release

## Required Commands

```bash
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
bash scripts/agent-guard.sh
```

## If a Command Fails

1. Read the error.
2. Identify root cause.
3. Fix product code or test expectation.
4. Re-run the failed command.
5. Re-run the full quality gate before final response.

## Forbidden

Do not:

- Skip failing tests
- Delete failing tests
- Weaken assertions just to pass
- Ignore build errors
- Claim success without command output
- Hide command failures

## Output Format

```md
## Commands Run

| Command | Result | Notes |
|---|---|---|

## Failures Found

## Fixes Applied

## Final Status
```
