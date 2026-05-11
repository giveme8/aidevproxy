<!--
GENERATED FILE. DO NOT EDIT DIRECTLY.

Source: skills/github-pr-ci/SKILL.md

Regenerate with:

  python scripts/init-agent-skills.py
-->

---
name: github-pr-ci
description: "Use this skill when creating PRs, checking CI, or fixing CI failures."
---

# GitHub PR and CI Skill

## Purpose

Use this skill when creating PRs, checking CI, or fixing CI failures.

## When to Use

Use this skill when:

- Preparing a PR
- Creating a PR with `gh`
- Checking GitHub Actions
- Fixing failed CI
- Reviewing PR status

## Preferred Tooling

Use GitHub CLI:

```bash
gh status
gh pr create
gh pr view
gh pr checks
gh run list
gh run view
gh run watch
```

## Required PR Steps

1. Run quality gate locally.
2. Run agent guard.
3. Check git diff.
4. Create clear commit.
5. Create PR.
6. Include screenshots for UI changes.
7. Include test results.
8. Watch CI.
9. Fix CI failures.

## PR Description Template

```md
## Summary

## Changed Files

## Test Results

## Screenshots

## Risks

## Approval Needed
```

## CI Failure Rules

If CI fails:

1. Read the failing job log.
2. Identify the first real failure.
3. Fix the cause.
4. Do not remove tests.
5. Re-run relevant local command.
6. Push fix.

## Forbidden

Do not:

- Merge failing PR
- Skip CI
- Delete tests to pass CI
- Force-push without reason
- Hide CI failures
