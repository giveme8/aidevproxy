# Component Mapping

Typical mappings from design HTML to React components:

```txt
design-html/pages/*.html     → src/pages/
design-html/styles/tokens.css → src/styles/globals.css
design-html/styles/layout.css → src/components/layout/
design-html/styles/components.css → src/components/business/
```

## Page ↔ Component Pattern

Each page maps to:
1. A page-level component (routing target)
2. Layout components (shell, sidebar, header)
3. Business components (cards, lists, forms)
4. Shared components (buttons, inputs, modals)

## Style Migration

- Extract CSS variables → design tokens
- Convert class-based styles to inline styles or CSS modules
- Match existing project patterns
