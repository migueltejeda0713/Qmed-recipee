import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Search, FilePlus, ListOrdered, Users, UserPlus,
  FileText, Pill, CirclePlus, FlaskConical, PlusCircle,
  Layers, PlusSquare, Stethoscope, ClipboardPlus,
} from "lucide-react";
import "../styles/CommandPalette.css";

const ITEMS = [
  // Vistas principales
  {
    group: "Recetas",
    label: "Nueva Receta",
    desc: "Crear una receta médica nueva",
    path: "/",
    modal: false,
    icon: FilePlus,
    keywords: ["nueva", "receta", "crear", "médica", "borrador"],
  },
  {
    group: "Recetas",
    label: "Listado de Recetas",
    desc: "Ver todas las recetas emitidas y borradores",
    path: "/list-recipes",
    modal: false,
    icon: FileText,
    keywords: ["lista", "recetas", "historial", "emitidas", "borradores"],
  },
  {
    group: "Recetas",
    label: "Mis Prescripciones",
    desc: "Catálogo personal de prescripciones frecuentes",
    path: "/prescripciones",
    modal: false,
    icon: Stethoscope,
    keywords: ["prescripciones", "plantillas", "catálogo", "frecuentes"],
  },
  {
    group: "Recetas",
    label: "Nueva Prescripción",
    desc: "Agregar una prescripción al catálogo",
    path: "/prescripciones",
    modal: false,
    openNew: true,
    icon: ClipboardPlus,
    keywords: ["nueva", "prescripcion", "agregar", "crear", "plantilla", "catalogo"],
  },
  {
    group: "Pacientes",
    label: "Lista de Pacientes",
    desc: "Ver y buscar pacientes registrados",
    path: "/list-pacients",
    modal: false,
    icon: Users,
    keywords: ["pacientes", "lista", "buscar"],
  },
  {
    group: "Pacientes",
    label: "Agregar Paciente",
    desc: "Registrar un nuevo paciente",
    path: "/addpacient",
    modal: true,
    icon: UserPlus,
    keywords: ["paciente", "nuevo", "agregar", "registrar", "crear"],
  },
  {
    group: "Medicamentos",
    label: "Lista de Medicamentos",
    desc: "Catálogo de medicamentos disponibles",
    path: "/list-medicines",
    modal: false,
    icon: Pill,
    keywords: ["medicamentos", "lista", "catálogo", "fármacos"],
  },
  {
    group: "Medicamentos",
    label: "Agregar Medicamento",
    desc: "Registrar un nuevo medicamento",
    path: "/medicamentos/add",
    modal: true,
    icon: CirclePlus,
    keywords: ["medicamento", "nuevo", "agregar", "crear", "fármaco"],
  },
  {
    group: "Laboratorios",
    label: "Lista de Laboratorios",
    desc: "Ver laboratorios registrados",
    path: "/list-laboratories",
    modal: false,
    icon: FlaskConical,
    keywords: ["laboratorios", "lista"],
  },
  {
    group: "Laboratorios",
    label: "Agregar Laboratorio",
    desc: "Registrar un nuevo laboratorio",
    path: "/laboratorios/add",
    modal: true,
    icon: PlusCircle,
    keywords: ["laboratorio", "nuevo", "agregar", "crear"],
  },
  {
    group: "Componentes",
    label: "Lista de Componentes",
    desc: "Ver componentes/principios activos",
    path: "/list-componentes",
    modal: false,
    icon: Layers,
    keywords: ["componentes", "lista", "principios", "activos"],
  },
  {
    group: "Componentes",
    label: "Agregar Componente",
    desc: "Registrar un nuevo componente",
    path: "/componentes/add",
    modal: true,
    icon: PlusSquare,
    keywords: ["componente", "nuevo", "agregar", "crear", "principio"],
  },
];

function normalize(str) {
  return str.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function filterItems(query) {
  if (!query.trim()) return ITEMS;
  const q = normalize(query);
  return ITEMS.filter(
    (item) =>
      normalize(item.label).includes(q) ||
      normalize(item.desc).includes(q) ||
      item.keywords.some((k) => normalize(k).includes(q)) ||
      normalize(item.group).includes(q)
  );
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const filtered = filterItems(query);

  // Ctrl+K global
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Resetear al abrir y bloquear scroll del body
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 30);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Mantener el item activo visible
  useEffect(() => {
    const el = listRef.current?.children[activeIdx];
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  const close = useCallback(() => setOpen(false), []);

  const go = useCallback((item) => {
    close();
    if (item.modal) {
      navigate(item.path, { state: { background: location } });
    } else if (item.openNew) {
      navigate(item.path, { state: { openNew: true } });
    } else {
      navigate(item.path);
    }
  }, [close, navigate, location]);

  const onKeyDown = (e) => {
    if (e.key === "Escape") { close(); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[activeIdx]) {
      go(filtered[activeIdx]);
    }
  };

  // Agrupar resultados
  const groups = filtered.reduce((acc, item, idx) => {
    const g = item.group;
    if (!acc[g]) acc[g] = [];
    acc[g].push({ ...item, _idx: idx });
    return acc;
  }, {});

  if (!open) return null;

  return (
    <div className="cp-overlay" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="cp-box" onKeyDown={onKeyDown}>
        {/* Search */}
        <div className="cp-search-row">
          <Search size={18} />
          <input
            ref={inputRef}
            className="cp-search-input"
            placeholder="Buscar vistas y acciones…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
            autoComplete="off"
          />
          <span className="cp-kbd">Esc</span>
        </div>

        {/* Results */}
        <div className="cp-results" ref={listRef}>
          {filtered.length === 0 ? (
            <div className="cp-empty">Sin resultados para "{query}"</div>
          ) : (
            Object.entries(groups).map(([group, items]) => (
              <div key={group}>
                <div className="cp-group-label">{group}</div>
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item._idx === activeIdx;
                  return (
                    <div
                      key={item.path + item.label}
                      className={`cp-item${isActive ? " active" : ""}`}
                      onMouseEnter={() => setActiveIdx(item._idx)}
                      onMouseDown={() => go(item)}
                    >
                      <div className="cp-item-icon">
                        <Icon size={16} />
                      </div>
                      <div className="cp-item-text">
                        <div className="cp-item-label">{item.label}</div>
                        <div className="cp-item-desc">{item.desc}</div>
                      </div>
                      <span className={`cp-item-badge ${item.modal || item.openNew ? "cp-badge-modal" : "cp-badge-view"}`}>
                        {item.modal || item.openNew ? "Modal" : "Vista"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="cp-footer">
          <span className="cp-footer-hint">
            <span className="cp-kbd">↑↓</span> navegar
          </span>
          <span className="cp-footer-hint">
            <span className="cp-kbd">↵</span> abrir
          </span>
          <span className="cp-footer-hint">
            <span className="cp-kbd">Esc</span> cerrar
          </span>
        </div>
      </div>
    </div>
  );
}
