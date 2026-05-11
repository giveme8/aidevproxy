# AI Change Guard Skill

## Purpose

Use this skill to prevent local coding agents from making unsafe or uncontrolled changes.

## When to Use

Use before final response, before commit, and before PR.

## Guarded Risks

- Secret leakage
- Test deletion
- Skipped tests
- Unapproved dependency changes
- Unapproved release config changes
- Unapproved deployment changes
- Large unrelated diffs

## Required Steps

1. Run `git status`.
2. Run `git diff --stat`.
3. Run `git diff --name-only`.
4. Run `bash scripts/agent-guard.sh`.
5. Review any sensitive file changes.
6. Report warnings honestly.

## Commands

```bash
git status
git diff --stat
git diff --name-only
bash scripts/agent-guard.sh
```

## Forbidden

Do not:

- Hide warnings
- Commit secret-like files
- Bypass guard
- Explain away skipped tests
- Continue release if guard warns

## Output Format

```md
## Git Status

## Diff Summary

## Guard Result

## Approval Needed

## Safe to Continue?
```
