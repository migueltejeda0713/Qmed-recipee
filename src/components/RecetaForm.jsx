// src/components/RecetaForm.jsx
import React, { useState, useMemo, useRef, useEffect } from "react";
import axios from "axios";
import "../styles/RecetaForm.css";
import { API_URL } from "../utils/api";

function initials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase();
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconX = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const IconEdit = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const IconTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);
const IconSave = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);
const IconPrint = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);
const IconCheck = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconPill = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
    <path d="m8.5 8.5 7 7" />
  </svg>
);

const defaultPresc = () => ({
  id: Date.now() + Math.random(),
  nombre: "",
  cantidad: "",
  dosis: "",
  modoUso: "",
  saved: false,
});

export default function RecetaForm() {
  const [patient, setPatient] = useState(null);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [prescriptions, setPrescriptions] = useState([defaultPresc()]);
  const [toast, setToast] = useState(null);

  const debounceRef = useRef(null);
  const searchRef = useRef(null);

  const calculateAge = useMemo(() => {
    if (!patient?.fechaNacimiento) return "";
    const today = new Date();
    const birth = new Date(patient.fechaNacimiento);
    if (Number.isNaN(birth.getTime())) return "";
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }, [patient]);

  const blurTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(blurTimerRef.current), []);

  const fetchRecent = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/searchpacient?limit=5`, {
        withCredentials: true,
      });
      setSearchResults(data?.data ?? []);
      setShowDropdown(true);
    } catch (err) {
      console.error("Error cargando pacientes recientes:", err);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setShowDropdown(true);
      fetchRecent();
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await axios.get(
          `${API_URL}/api/searchpacient?name=${encodeURIComponent(value)}`,
          { withCredentials: true }
        );
        setSearchResults(data?.data ?? []);
        setShowDropdown(true);
      } catch (err) {
        console.error("Error buscando pacientes:", err);
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 500);
  };

  const handleSelectPaciente = (p) => {
    setPatient({
      id: p.id || "",
      nombre: p.name || "",
      fechaNacimiento: p.birthDate || "",
      documento: p.document_id || "",
    });
    setQuery("");
    setSearchResults([]);
    setShowDropdown(false);
  };

  const clearPatient = () => {
    setPatient(null);
    setQuery("");
    setShowDropdown(false);
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const updateRx = (id, field, value) => {
    setPrescriptions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const saveRx = (id) => {
    setPrescriptions((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        if (!p.nombre.trim() || !p.cantidad.trim() || !p.dosis.trim()) {
          showToast("Complete nombre, cantidad y dosis");
          return p;
        }
        return { ...p, saved: true };
      })
    );
  };

  const editRx = (id) => {
    setPrescriptions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, saved: false } : p))
    );
  };

  const deleteRx = (id) => {
    setPrescriptions((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      return updated.length ? updated : [defaultPresc()];
    });
  };

  const addRx = () => {
    setPrescriptions((prev) => [...prev, defaultPresc()]);
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!patient) {
      showToast("Selecciona un paciente primero");
      return;
    }
    const unsaved = prescriptions.filter((p) => !p.saved);
    if (unsaved.length > 0) {
      showToast("Guarda todas las prescripciones antes de continuar");
      return;
    }
    console.log({
      pacienteId: patient.id,
      patient,
      edad: calculateAge,
      prescriptions: prescriptions.filter((p) => p.saved),
    });
    showToast("Receta guardada exitosamente");
  };

  const savedCount = prescriptions.filter((p) => p.saved).length;
  const canAddAnother =
    prescriptions.length === 0 ||
    prescriptions[prescriptions.length - 1].saved;

  const todayLabel = new Date().toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="receta-page">
      <div className="page-heading">
        <h1>Nueva Receta Médica</h1>
        <p>Complete los datos del paciente y agregue las prescripciones correspondientes.</p>
      </div>

      <form className="main-card" onSubmit={handleSubmit}>
        <div className="card-body">
          {/* LEFT: Paciente */}
          <div className="col-left">
            <div>
              <div className="section-label">
                <div className="section-label-dot" />
                <h2>Datos del paciente</h2>
              </div>

              {!patient ? (
                <div className="field-group" style={{ position: "relative" }}>
                  <label className="field-label">Buscar paciente</label>
                  <div className="search-wrap">
                    <span className="search-icon"><IconSearch /></span>
                    <input
                      ref={searchRef}
                      className="field-input search-input"
                      placeholder="Nombre del paciente…"
                      value={query}
                      onChange={handleSearchChange}
                      onFocus={() => {
                        clearTimeout(blurTimerRef.current);
                        setShowDropdown(true);
                        if (!query) fetchRecent();
                      }}
                      onBlur={() => {
                        blurTimerRef.current = setTimeout(
                          () => setShowDropdown(false),
                          150
                        );
                      }}
                      autoComplete="off"
                    />
                    {query && (
                      <button
                        type="button"
                        className="search-clear"
                        onClick={() => {
                          setQuery("");
                          setShowDropdown(false);
                        }}
                      >
                        <IconX />
                      </button>
                    )}
                  </div>
                  {showDropdown && searchResults.length > 0 && (
                    <ul className="rx-dropdown">
                      <li className="dropdown-header">
                        Resultados ({searchResults.length})
                      </li>
                      {searchResults.map((p) => (
                        <li
                          key={p.id}
                          className="rx-dropdown-item"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleSelectPaciente(p)}
                        >
                          <div className="dropdown-avatar">{initials(p.name)}</div>
                          <div>
                            <div className="dropdown-item-name">{p.name}</div>
                            <div className="dropdown-item-meta">
                              {p.document_id || "—"}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <div className="patient-banner">
                  <div className="patient-banner-avatar">{initials(patient.nombre)}</div>
                  <div>
                    <div className="patient-banner-name">{patient.nombre}</div>
                    <div className="patient-banner-meta">{patient.documento || "—"}</div>
                  </div>
                  <button
                    type="button"
                    className="patient-banner-change"
                    onClick={clearPatient}
                  >
                    Cambiar
                  </button>
                </div>
              )}

              {patient ? (
                <>
                  <div className="col-divider" style={{ margin: "20px 0" }} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div className="fields-row">
                      <div className="field-group">
                        <label className="field-label">Fecha de nacimiento</label>
                        <div className={`readonly-field${!patient.fechaNacimiento ? " empty" : ""}`}>
                          {formatDate(patient.fechaNacimiento) || "—"}
                        </div>
                      </div>
                      <div className="field-group">
                        <label className="field-label">Edad</label>
                        <div className={`readonly-field${calculateAge === "" ? " empty" : ""}`}>
                          {calculateAge !== "" ? `${calculateAge} años` : "—"}
                        </div>
                      </div>
                    </div>
                    <div className="field-group">
                      <label className="field-label">Documento</label>
                      <div className={`readonly-field${!patient.documento ? " empty" : ""}`}>
                        {patient.documento || "—"}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="empty-patient-hint">
                  Busca y selecciona un paciente para ver sus datos y continuar con la receta.
                </div>
              )}
            </div>

            <div className="footer-meta">
              <div className="col-divider" style={{ marginBottom: 16 }} />
              <div className="fields-row">
                <div className="field-group">
                  <label className="field-label">Fecha de emisión</label>
                  <div className="readonly-field">{todayLabel}</div>
                </div>
                <div className="field-group">
                  <label className="field-label">Médico</label>
                  <div className="readonly-field">Dr. Ramírez</div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Prescripciones */}
          <div className="col-right">
            <div className="section-label">
              <div className="section-label-dot" />
              <h2>Prescripciones</h2>
              {savedCount > 0 && (
                <span className="saved-badge">
                  {savedCount} guardada{savedCount > 1 ? "s" : ""}
                </span>
              )}
            </div>

            <div className="rx-list">
              {prescriptions.length === 0 && (
                <div className="rx-empty">
                  <div className="rx-empty-icon"><IconPill /></div>
                  <p>Sin prescripciones</p>
                  <span>Agrega la primera prescripción</span>
                </div>
              )}

              {prescriptions.map((rx, idx) =>
                rx.saved ? (
                  <div key={rx.id} className="rx-card">
                    <div className="rx-card-index">{idx + 1}</div>
                    <div className="rx-card-body">
                      <div className="rx-card-name">{rx.nombre || "—"}</div>
                      <div className="rx-card-pills">
                        {rx.cantidad && <span className="rx-pill">Cant. {rx.cantidad}</span>}
                        {rx.dosis && <span className="rx-pill">{rx.dosis}</span>}
                      </div>
                      {rx.modoUso && <div className="rx-card-usage">{rx.modoUso}</div>}
                    </div>
                    <div className="rx-card-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        title="Editar"
                        onClick={() => editRx(rx.id)}
                      >
                        <IconEdit />
                      </button>
                      <button
                        type="button"
                        className="icon-btn danger"
                        title="Eliminar"
                        onClick={() => deleteRx(rx.id)}
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div key={rx.id} className="rx-edit-block">
                    <div className="rx-edit-block-num">Prescripción {idx + 1}</div>
                    <div className="rx-edit-grid">
                      <div className="field-group span-2">
                        <label className="field-label">Medicamento</label>
                        <input
                          className="field-input"
                          placeholder="Ej. Amoxicilina 500mg"
                          value={rx.nombre}
                          onChange={(e) => updateRx(rx.id, "nombre", e.target.value)}
                        />
                      </div>
                      <div className="field-group">
                        <label className="field-label">Cantidad</label>
                        <input
                          className="field-input"
                          placeholder="Ej. 30 cápsulas"
                          value={rx.cantidad}
                          onChange={(e) => updateRx(rx.id, "cantidad", e.target.value)}
                        />
                      </div>
                      <div className="field-group">
                        <label className="field-label">Dosis</label>
                        <input
                          className="field-input"
                          placeholder="Ej. 1 c/8h"
                          value={rx.dosis}
                          onChange={(e) => updateRx(rx.id, "dosis", e.target.value)}
                        />
                      </div>
                      <div className="field-group span-2">
                        <label className="field-label">Modo de uso</label>
                        <input
                          className="field-input"
                          placeholder="Instrucciones adicionales (opcional)"
                          value={rx.modoUso}
                          onChange={(e) => updateRx(rx.id, "modoUso", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="rx-edit-actions">
                      {prescriptions.length > 1 && (
                        <button
                          type="button"
                          className="rx-delete-btn"
                          onClick={() => deleteRx(rx.id)}
                        >
                          <IconTrash /> Eliminar
                        </button>
                      )}
                      <button
                        type="button"
                        className="rx-save-btn"
                        onClick={() => saveRx(rx.id)}
                      >
                        <IconCheck /> Guardar
                      </button>
                    </div>
                  </div>
                )
              )}

              <button
                type="button"
                className="add-rx-btn"
                onClick={addRx}
                disabled={!canAddAnother}
              >
                <IconPlus /> Agregar prescripción
              </button>
            </div>
          </div>
        </div>

        <div className="card-footer">
          <button type="button" className="btn-secondary">
            <IconPrint /> Imprimir
          </button>
          <button type="submit" className="btn-primary-rx">
            <IconSave /> Guardar receta
          </button>
        </div>
      </form>

      {toast && (
        <div className="rx-toast">
          <span className="toast-icon"><IconCheck /></span>
          {toast}
        </div>
      )}
    </div>
  );
}
