<!--
GENERATED FILE. DO NOT EDIT DIRECTLY.

Source: skills/tauri-debug/SKILL.md

Regenerate with:

  python scripts/init-agent-skills.py
-->

---
name: tauri-debug
description: "Use this skill when debugging the Tauri client locally."
---

# Tauri Debug Skill

## Purpose

Use this skill when debugging the Tauri client locally.

## When to Use

Use this skill when:

- `npm run tauri dev` fails
- The Tauri window opens but UI is broken
- Console errors appear
- Dev URL cannot be loaded
- Tauri backend commands fail
- Platform-specific behavior needs investigation

## Required Steps

1. Run the Tauri dev command.
2. Capture terminal output.
3. Identify the dev URL.
4. Check console errors.
5. Check network errors.
6. Check DOM and layout.
7. Capture screenshot if UI is involved.
8. Fix the smallest likely cause.
9. Re-run quality gate.

## Common Commands

```bash
npm run tauri dev
```

If only frontend debugging is needed:

```bash
npm run dev
```

## Debug Checklist

- [ ] Dev server started
- [ ] Tauri process started
- [ ] Window opened
- [ ] Dev URL reachable
- [ ] Console has no blocking errors
- [ ] Network requests succeed
- [ ] Tauri commands work
- [ ] Screenshot captured if UI changed
- [ ] Quality gate passed

## Forbidden

Do not:

- Modify signing config for local dev issues
- Delete Tauri config
- Change package manager
- Disable tests
- Ignore console errors

## Output Format

```md
## Problem

## Root Cause

## Fix

## Commands Run

## Test Results

## Screenshot Path

## Follow-ups
```
