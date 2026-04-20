# Sidebar Visual Refinement — Design Spec
**Date:** 2026-04-20
**Scope:** `src/components/SidebarMenu.jsx` + `src/styles/sidebar.css`
**Approach:** CSS overrides on PrimeReact PanelMenu + minimal JSX route-detection hook

---

## Context

The sidebar uses PrimeReact's `PanelMenu` component with ~14 lines of custom CSS. The goal is a subtle visual polish — better spacing, hierarchy, states (hover/active/expanded), and route-aware active highlighting — without changing the overall structure, palette, or replacing the PrimeReact component.

---

## Files Changed

| File | Change type |
|------|-------------|
| `src/styles/sidebar.css` | Full rewrite — CSS overrides on PrimeReact classes |
| `src/components/SidebarMenu.jsx` | Minimal — add `isActive()` helper, add `active` class to label spans |

---

## Section 1 — Spacing and Shape

- Gap between panels: `4px` (`margin-bottom: 0.25rem`)
- Panel header padding: `0.65rem 1rem`
- Sub-item padding: `0.45rem 1rem 0.45rem 2.75rem` (clear visual indentation)
- Border-radius: `8px` on panel headers and sub-items (matches app card style)
- Remove PrimeReact default borders and shadows between panels
- Sidebar wrapper keeps its existing `260px` width and `#f8f9fa` background

---

## Section 2 — Visual States

All states are implemented in CSS using the `:has(.menu-label.active)` selector on PrimeReact wrapper elements. The `active` class is injected by JSX based on `location.pathname`.

| State | Background | Text color | Extra detail |
|-------|------------|------------|--------------|
| Normal | transparent | `#374151` | no decoration |
| Hover | `#eff6ff` | `#1e40af` | `transition: background 150ms ease` |
| Active (route match) | `#dbeafe` | `#1d4ed8` | `border-left: 2px solid #0d6efd` |
| Expanded (open panel) | `#f0f7ff` | `#374151` | no border, very light bg |
| Sub-item active | `#dbeafe` | `#1d4ed8` | no border, bg only |

Chevron (PrimeReact toggle icon):
- Default color: `#9ca3af`
- Hover/expanded color: `#0d6efd`
- Rotation transition: `0.2s ease`

---

## Section 3 — Route-Aware Active State (JSX)

Add a helper in `SidebarMenu.jsx` that checks the current pathname:

```js
const isActive = (paths) =>
  paths.some((p) => location.pathname === p || location.pathname.startsWith(p));
```

Each top-level and sub-item label span gets an `active` class when its associated routes match:

```jsx
<span className={`menu-label${isActive(['/list-pacients', '/addpacient']) ? ' active' : ''}`}>
  <Users size={18} style={iconStyle} /> Pacientes
</span>
```

Route mappings per section:
| Section | Routes |
|---------|--------|
| Pacientes (top) | `/list-pacients`, `/addpacient` |
| Lista de pacientes | `/list-pacients` |
| Agregar paciente | `/addpacient` |
| Recetas (top) | `/list-recipes` — (`/` solo si `pathname === '/'` exacto) |
| Crear receta | `/` (igualdad exacta, no startsWith) |
| Listado de recetas | `/list-recipes` |
| Laboratorios (top) | `/list-laboratories`, `/addlaboratorio` |
| Lista de laboratorios | `/list-laboratories` |
| Agregar laboratorio | `/addlaboratorio` |
| Componentes (top) | `/list-componentes`, `/componentes/add` |
| Lista de componentes | `/list-componentes` |
| Agregar componente | `/componentes/add` |
| Medicamentos (top) | `/list-medicines`, `/medicamentos/add` |
| Lista de medicamentos | `/list-medicines` |
| Agregar medicamento | `/medicamentos/add` |
| Cuenta (top) | *(no active route — logout only)* |
| Cerrar sesión | *(no active route)* |

The `active` class is only a CSS hook — it does not change behavior or navigation.

---

## Section 4 — Typography

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Top-level label (normal) | `0.875rem` | `500` | `#374151` |
| Top-level label (active) | `0.875rem` | `600` | `#1d4ed8` |
| Sub-item label (normal) | `0.8125rem` | `400` | `#6b7280` |
| Sub-item label (active) | `0.8125rem` | `500` | `#1d4ed8` |

Font family inherits `system-ui` from `index.css`. No new font imports.

---

## Constraints

- No changes to overall layout, sidebar width, or App.css
- No new color palette — only variations of existing blue (`#0d6efd`, `#dbeafe`, `#eff6ff`) and neutral grays
- No dark theme, no illustrations, no heavy shadows
- Must not affect other PrimeReact components — all selectors scoped under `.sidebar-menu`
- `:has()` selector has >95% browser support; acceptable for an internal medical admin tool
