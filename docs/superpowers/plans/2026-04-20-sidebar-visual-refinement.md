# Sidebar Visual Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refinar visualmente el sidebar izquierdo con mejor espaciado, jerarquía, estados hover/active/expanded, y detección de ruta activa — sin cambiar la estructura ni la paleta principal.

**Architecture:** CSS overrides sobre PrimeReact PanelMenu (v10) scoped bajo `.sidebar-menu`. Detección de ruta activa via `location.pathname` en JSX, inyectando clase `active` en los spans de los labels, usada solo como gancho CSS con `:has()`.

**Tech Stack:** React, PrimeReact v10 (PanelMenu), react-router-dom (useLocation), CSS puro (sin módulos)

---

## File Map

| File | Acción | Responsabilidad |
|------|--------|-----------------|
| `src/styles/sidebar.css` | Reescritura completa | Todos los overrides visuales del sidebar |
| `src/components/SidebarMenu.jsx` | Modificación | Añadir helper `isActive`, añadir clase `active` a label spans |

---

## Task 1: Reescribir `sidebar.css` con overrides visuales completos

**Files:**
- Modify: `src/styles/sidebar.css`

### Estructura HTML que genera PrimeReact v10 PanelMenu (referencia)

```html
<div class="p-panelmenu">
  <div class="p-panelmenu-panel">
    <div class="p-panelmenu-header [p-highlight cuando expandido]">
      <div class="p-panelmenu-header-content">
        <a class="p-panelmenu-header-link">
          <span class="p-panelmenu-icon"><!-- chevron SVG --></span>
          <span class="p-menuitem-text">
            <span class="menu-label [active]"><!-- nuestro label --></span>
          </span>
        </a>
      </div>
    </div>
    <div class="p-toggleable-content [p-toggleable-content-collapsed]">
      <div class="p-panelmenu-content">
        <ul class="p-panelmenu-root-list">
          <li class="p-menuitem">
            <div class="p-menuitem-content">
              <a class="p-menuitem-link">
                <span class="p-menuitem-text">
                  <span class="menu-label [active]"><!-- nuestro sub-label --></span>
                </span>
              </a>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 1: Reemplazar completamente `src/styles/sidebar.css` con el siguiente contenido**

```css
/* ============================= */
/* menu-label: icon + text row   */
/* ============================= */
.menu-label {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

/* ============================= */
/* Panel wrapper                 */
/* ============================= */
.sidebar-menu .p-panelmenu-panel {
  margin-bottom: 4px;
  border-radius: 8px;
  overflow: hidden;
}

/* ============================= */
/* Panel header — reset PrimeReact defaults */
/* ============================= */
.sidebar-menu .p-panelmenu-header {
  border: none !important;
  background: transparent !important;
}

.sidebar-menu .p-panelmenu-header-content {
  border: none !important;
  background: transparent !important;
  border-radius: 8px;
}

.sidebar-menu .p-panelmenu-header-link {
  padding: 0.65rem 1rem !important;
  border: none !important;
  background: transparent !important;
  border-radius: 8px;
  border-left: 2px solid transparent !important;
  transition: background 150ms ease, border-color 150ms ease;
}

/* Hover — header */
.sidebar-menu .p-panelmenu-header-content:hover .p-panelmenu-header-link {
  background: #eff6ff !important;
}

/* Expanded */
.sidebar-menu .p-panelmenu-header.p-highlight .p-panelmenu-header-link {
  background: #f0f7ff !important;
}

/* Active (ruta actual) */
.sidebar-menu .p-panelmenu-header-link:has(.menu-label.active) {
  background: #dbeafe !important;
  border-left: 2px solid #0d6efd !important;
}

/* Texto activo en header */
.sidebar-menu .p-panelmenu-header-link:has(.menu-label.active) .menu-label {
  color: #1d4ed8;
  font-weight: 600;
}

/* ============================= */
/* Chevron icon                  */
/* ============================= */
.sidebar-menu .p-panelmenu-icon {
  color: #9ca3af;
  transition: color 0.2s ease;
  flex-shrink: 0;
}

.sidebar-menu .p-panelmenu-header-content:hover .p-panelmenu-icon,
.sidebar-menu .p-panelmenu-header.p-highlight .p-panelmenu-icon {
  color: #0d6efd;
}

/* ============================= */
/* Sub-items container           */
/* ============================= */
.sidebar-menu .p-panelmenu-content {
  border: none !important;
  background: transparent !important;
  padding: 0.25rem 0;
}

/* ============================= */
/* Sub-item                      */
/* ============================= */
.sidebar-menu .p-menuitem {
  margin-bottom: 2px;
}

.sidebar-menu .p-menuitem-content {
  border-radius: 8px;
}

.sidebar-menu .p-menuitem-link {
  padding: 0.45rem 1rem 0.45rem 2.75rem !important;
  background: transparent !important;
  border-radius: 8px;
  transition: background 150ms ease;
}

/* Sub-item hover */
.sidebar-menu .p-menuitem-link:hover {
  background: #eff6ff !important;
}

/* Sub-item active */
.sidebar-menu .p-menuitem-link:has(.menu-label.active) {
  background: #dbeafe !important;
}

/* Sub-item label — normal */
.sidebar-menu .p-menuitem-text .menu-label {
  font-size: 0.8125rem;
  font-weight: 400;
  color: #6b7280;
}

/* Sub-item label — active */
.sidebar-menu .p-menuitem-link:has(.menu-label.active) .menu-label {
  font-weight: 500;
  color: #1d4ed8;
}
```

- [ ] **Step 2: Verificar en browser que el sidebar visualmente cambia**

Abrir `http://localhost:5173` (o el puerto del dev server). El sidebar debe verse con mejor padding, bordes redondeados y hover suave en azul claro. No debe verse ningún borde negro ni fondo gris por defecto de PrimeReact en los panels.

Si los estilos de PrimeReact sobreescriben los nuestros, es porque el `@layer primereact` tiene menor especificidad — en ese caso los `!important` ya lo resuelven.

- [ ] **Step 3: Commit**

```bash
git add src/styles/sidebar.css
git commit -m "style: refine sidebar visual polish — spacing, states, border-radius"
```

---

## Task 2: Añadir detección de ruta activa en `SidebarMenu.jsx`

**Files:**
- Modify: `src/components/SidebarMenu.jsx`

La estrategia: añadir `isActive(paths)` que compara `location.pathname` contra un array de rutas exactas. Agregar clase `active` al span de cada item (top-level y sub-items).

- [ ] **Step 1: Añadir helper `isActive` después de la línea `const currentLocation = ...`**

En [src/components/SidebarMenu.jsx](src/components/SidebarMenu.jsx), después de la línea 26 (`const currentLocation = useMemo(...)`), añadir:

```js
const isActive = (paths) => paths.includes(location.pathname);
```

- [ ] **Step 2: Actualizar labels de top-level items con clase `active`**

Reemplazar los 6 labels de secciones principales. El patrón es: si alguna ruta hija está activa, el padre también se marca activo.

**Pacientes** (línea ~33):
```jsx
label: (
  <span className={`menu-label${isActive(['/list-pacients', '/addpacient']) ? ' active' : ''}`}>
    <Users size={18} style={iconStyle} /> Pacientes
  </span>
),
```

**Recetas** (línea ~58):
```jsx
label: (
  <span className={`menu-label${isActive(['/', '/list-recipes']) ? ' active' : ''}`}>
    <FileText size={18} style={iconStyle} /> Recetas
  </span>
),
```

**Laboratorios** (línea ~83):
```jsx
label: (
  <span className={`menu-label${isActive(['/list-laboratories', '/addlaboratorio']) ? ' active' : ''}`}>
    <FlaskConical size={18} style={iconStyle} /> Laboratorios
  </span>
),
```

**Componentes** (línea ~108):
```jsx
label: (
  <span className={`menu-label${isActive(['/list-componentes', '/componentes/add']) ? ' active' : ''}`}>
    <Layers size={18} style={iconStyle} /> Componentes
  </span>
),
```

**Medicamentos** (línea ~134):
```jsx
label: (
  <span className={`menu-label${isActive(['/list-medicines', '/medicamentos/add']) ? ' active' : ''}`}>
    <Pill size={18} style={iconStyle} /> Medicamentos
  </span>
),
```

**Cuenta** — no tiene ruta activa, sin cambios.

- [ ] **Step 3: Actualizar labels de sub-items con clase `active`**

Mismo patrón para cada sub-item. Solo cambia el array de rutas (una sola ruta por sub-item).

**Lista de pacientes**:
```jsx
label: (
  <span className={`menu-label${isActive(['/list-pacients']) ? ' active' : ''}`}>
    <ListOrdered size={16} style={iconStyle} /> Lista de pacientes
  </span>
),
```

**Agregar paciente**:
```jsx
label: (
  <span className={`menu-label${isActive(['/addpacient']) ? ' active' : ''}`}>
    <UserPlus size={16} style={iconStyle} /> Agregar paciente
  </span>
),
```

**Crear receta**:
```jsx
label: (
  <span className={`menu-label${isActive(['/']) ? ' active' : ''}`}>
    <FilePlus size={16} style={iconStyle} /> Crear receta
  </span>
),
```

**Listado de recetas**:
```jsx
label: (
  <span className={`menu-label${isActive(['/list-recipes']) ? ' active' : ''}`}>
    <ListOrdered size={16} style={iconStyle} /> Listado de recetas
  </span>
),
```

**Lista de laboratorios**:
```jsx
label: (
  <span className={`menu-label${isActive(['/list-laboratories']) ? ' active' : ''}`}>
    <ListOrdered size={16} style={iconStyle} /> Lista de laboratorios
  </span>
),
```

**Agregar laboratorio**:
```jsx
label: (
  <span className={`menu-label${isActive(['/addlaboratorio']) ? ' active' : ''}`}>
    <PlusCircle size={16} style={iconStyle} /> Agregar laboratorio
  </span>
),
```

**Lista de componentes**:
```jsx
label: (
  <span className={`menu-label${isActive(['/list-componentes']) ? ' active' : ''}`}>
    <ListOrdered size={16} style={iconStyle} /> Lista de componentes
  </span>
),
```

**Agregar componente**:
```jsx
label: (
  <span className={`menu-label${isActive(['/componentes/add']) ? ' active' : ''}`}>
    <PlusSquare size={16} style={iconStyle} /> Agregar componente
  </span>
),
```

**Lista de medicamentos**:
```jsx
label: (
  <span className={`menu-label${isActive(['/list-medicines']) ? ' active' : ''}`}>
    <ClipboardList size={16} style={iconStyle} /> Lista de medicamentos
  </span>
),
```

**Agregar medicamento**:
```jsx
label: (
  <span className={`menu-label${isActive(['/medicamentos/add']) ? ' active' : ''}`}>
    <CirclePlus size={16} style={iconStyle} /> Agregar medicamento
  </span>
),
```

**Cerrar sesión** — sin clase active (es solo acción).

- [ ] **Step 4: Verificar en browser los estados activos**

1. Navegar a `/list-pacients` — el item "Lista de pacientes" debe verse con fondo `#dbeafe` y texto azul. El header "Pacientes" también debe mostrar fondo azul claro + borde izquierdo azul.
2. Navegar a `/list-medicines` — "Lista de medicamentos" activo, "Medicamentos" activo.
3. Navegar a `/` — "Crear receta" activo, "Recetas" activo.
4. Verificar que el hover sigue funcionando en items no activos.

- [ ] **Step 5: Commit**

```bash
git add src/components/SidebarMenu.jsx
git commit -m "feat: add route-aware active state to sidebar menu items"
```
