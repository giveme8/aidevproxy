# UI Visual Review Skill

## Purpose

Use this skill when reviewing screenshots of the AIDevProxy client UI.

## When to Use

Use this skill when:

- A UI screenshot needs review
- A UI implementation needs comparison against a design image
- A UI implementation needs comparison against golden screenshots
- A page looks visually inconsistent
- Visual feedback is needed after UI changes

## Inputs

Required:

- Current screenshot

Optional but recommended:

- Golden screenshot
- Target UI design image
- Page spec from `specs/`
- Design tokens from `design-html/styles/design-tokens.json`
- Screenshot resolution and platform

## Review Criteria

Check:

1. Layout stability
2. Visual hierarchy
3. Spacing
4. Typography
5. Color consistency
6. Shadow consistency
7. Radius consistency
8. Dark mode quality
9. macOS / Windows / Linux native feeling
10. Component alignment
11. Overflow / clipping / crowded areas
12. Difference from golden screenshot
13. Difference from target design
14. Empty / loading / error state quality

## Rules

- Do not only say "looks bad".
- Always provide concrete, executable suggestions.
- Prefer component-level and CSS-level instructions.
- Prefer existing design tokens.
- Mention exact areas of the page.
- Give tasks that can be implemented without visual judgment.

## Output Format

```md
## Overall Assessment

## Major Issues

## Specific Fixes

## Tasks for Agent

## Risk Notes
```

## Example Feedback

```md
## Overall Assessment

The page has a solid dark desktop client foundation, but the main status card is visually weak.

## Major Issues

1. The main status card does not dominate the page enough.
2. The metric cards are too flat compared with the main card.
3. Sidebar active state lacks contrast.

## Specific Fixes

1. Increase `.statusCard` padding from `48px` to `52px 56px`.
2. Add button shadow: `0 12px 40px rgba(109,125,255,.28)`.
3. Increase `.metricCard strong` font size from `28px` to `30px`.

## Tasks for Agent

- Update `src/styles/globals.css`.
- Do not modify React logic.
- Run quality gate.
- Capture `screenshots/after/dashboard.png`.

## Risk Notes

Do not introduce new colors. Use existing primary token.
```
