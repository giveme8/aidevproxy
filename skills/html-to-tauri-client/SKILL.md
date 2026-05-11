# HTML to Tauri Client Skill

## Purpose

Use this skill when converting HTML/CSS prototypes into real Tauri + React client code.

## When to Use

Use this skill when:

- HTML/CSS prototypes have been produced from design
- A static page needs to become React components
- HTML needs to be mapped to app pages, components, and styles
- Design tokens need to be merged into the real client app

## Inputs

Required:

- `design-html/pages/*.html`
- `design-html/styles/*.css`
- `design-html/styles/design-tokens.json`
- Relevant page spec in `specs/`

Optional:

- Existing React components
- Existing tests
- Golden screenshots

## Output

Generate or update:

- React pages in `src/pages/`
- React components in `src/components/`
- CSS / design tokens
- State placeholders
- Tests
- Screenshot capture flow

## Required Steps

1. Read relevant HTML prototype.
2. Read design tokens.
3. Read page spec.
4. Identify reusable components.
5. Map HTML sections to React components.
6. Preserve class names when useful.
7. Use existing design tokens.
8. Add or update tests.
9. Run quality gate.
10. Capture screenshot if UI changed.

## Component Mapping

Typical mapping:

```txt
design-html/pages/dashboard.html
  → src/pages/DashboardPage.tsx

sidebar markup
  → src/components/layout/AppShell.tsx

status card markup
  → src/components/business/StatusCard.tsx

metric card markup
  → src/components/business/MetricCard.tsx

tokens.css / components.css
  → src/styles/globals.css
```

## Forbidden

Do not:

- Rewrite the whole app
- Invent unrelated styles
- Add dependencies without approval
- Remove failing tests
- Touch release config
- Touch secrets
- Change package manager

## Quality Gate

```bash
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
bash scripts/agent-guard.sh
```

## Final Output

```md
## Components Created / Updated

## Files Changed

## Design Tokens Used

## Tests Added / Updated

## Commands Run

## Screenshot Path

## Risks
```
