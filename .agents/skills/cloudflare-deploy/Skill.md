<!--
GENERATED FILE. DO NOT EDIT DIRECTLY.

Source: skills/cloudflare-deploy/SKILL.md

Regenerate with:

  python scripts/init-agent-skills.py
-->

---
name: cloudflare-deploy
description: "Use this skill when deploying the Next.js website to Cloudflare Workers."
---

# Cloudflare Deploy Skill

## Purpose

Use this skill when deploying the Next.js website to Cloudflare Workers.

## When to Use

Use this skill for:

- `wrangler dev` (local dev)
- `wrangler deploy` (deploy to Cloudflare)
- Environment variables / secrets
- Worker logs

## Preferred Tooling

Use `wrangler` CLI from the `website/` directory.

Common commands:

```bash
cd website
wrangler dev
wrangler deploy
wrangler tail
wrangler secret put
```

## Required Steps

1. Identify environment: development / staging / production.
2. Run local tests.
3. Run `wrangler dev` where applicable.
4. Check environment variables.
5. Deploy only after approval for production.
6. Run `wrangler tail` after deploy.
7. Verify endpoint behavior.
8. Roll back if serious errors appear.

## Approval Required

Manual approval required before:

- production deploy
- changing production secrets
- changing production routes
- modifying cron triggers

## Forbidden

Do not:

- Print Cloudflare API tokens
- Modify production without approval
- Deploy if tests fail
- Ignore worker tail errors

## Output Format

```md
## Environment

## Changes

## Commands Run

## Deploy Status

## Logs Checked

## Rollback Plan

## Risks
```
