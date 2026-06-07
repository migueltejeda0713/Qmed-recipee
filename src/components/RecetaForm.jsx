// src/components/RecetaForm.jsx
import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api, API_URL } from "../utils/api";
import axios from "axios";
import RecipePrintView from "./RecipePrintView";
import "../styles/RecetaForm.css";

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
  localId: Date.now() + Math.random(),
  serverId: null,
  nombre: "",
  cantidad: "",
  dosis: "",
  modoUso: "",
  saved: false,
  dirty: false,
});

function toPrescriptionPayload(p) {
  return {
    name: p.nombre.trim(),
    quantity: p.cantidad.trim(),
    dosage: p.dosis.trim(),
    usage_instructions: p.modoUso.trim(),
  };
}

function fromServerPrescription(s) {
  return {
    localId: s.id,
    serverId: s.id,
    nombre: s.name || "",
    cantidad: s.quantity || "",
    dosis: s.dosage || "",
    modoUso: s.usage_instructions || "",
    saved: true,
    dirty: false,
  };
}

export default function RecetaForm() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const recipeIdFromUrl = searchParams.get("id");

  const [recipeId, setRecipeId] = useState(null);
  const [status, setStatus] = useState("DRAFT");
  const [recipeNumber, setRecipeNumber] = useState(null);

  const [patient, setPatient] = useState(null);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [prescriptions, setPrescriptions] = useState([defaultPresc()]);
  const [generalNotes, setGeneralNotes] = useState("");
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [printDoc, setPrintDoc] = useState(null);

  const debounceRef = useRef(null);
  const searchRef = useRef(null);
  const blurTimerRef = useRef(null);
  const tplDebounceRef = useRef(null);
  const [templateSuggestions, setTemplateSuggestions] = useState([]);
  const [activeTplLocalId, setActiveTplLocalId] = useState(null);
  useEffect(() => () => { clearTimeout(blurTimerRef.current); clearTimeout(tplDebounceRef.current); }, []);

  const isDraft = status === "DRAFT";
  const isIssued = status === "ISSUED" || status === "PRINTED";

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

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  }, []);

  // Load existing recipe if ?id= present.
  useEffect(() => {
    if (!recipeIdFromUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/api/recipes/${recipeIdFromUrl}`);
        if (cancelled) return;
        setRecipeId(data.id);
        setStatus(data.status);
        setRecipeNumber(data.recipe_number || null);
        setGeneralNotes(data.general_notes || "");
        setPatient({
          id: data.id_patient,
          nombre: data.patient_name_snapshot || "",
          documento: data.patient_document_snapshot || "",
          fechaNacimiento: "",
        });
        // If issued, snapshot has the name; if draft, fetch patient details quickly.
        if (data.status === "DRAFT") {
          try {
            const search = await api.get(`/api/searchpacient`, {
              params: { id: data.id_patient },
            });
            const found = (search.data?.data || []).find((p) => p.id === data.id_patient);
            if (found) {
              setPatient({
                id: found.id,
                nombre: found.name || "",
                documento: found.document_id || "",
                fechaNacimiento: found.birthDate || "",
              });
            }
          } catch { /* non-fatal */ }
        }
        const lines = (data.prescriptions || []).map(fromServerPrescription);
        setPrescriptions(lines.length ? lines : [defaultPresc()]);
      } catch (err) {
        console.error(err);
        showToast("No se pudo cargar la receta");
      }
    })();
    return () => { cancelled = true; };
  }, [recipeIdFromUrl, showToast]);

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
    if (recipeId) {
      showToast("No se puede cambiar el paciente de una receta guardada");
      return;
    }
    setPatient(null);
    setQuery("");
    setShowDropdown(false);
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const updateRx = (localId, field, value) => {
    setPrescriptions((prev) =>
      prev.map((p) =>
        p.localId === localId ? { ...p, [field]: value, dirty: true } : p
      )
    );
  };

  // Save a single prescription card. Handles 3 cases:
  // - No recipe yet → create recipe with this single line (and any other already-saved lines too).
  // - Recipe exists, no serverId → POST add line.
  // - Recipe exists, has serverId, dirty → PUT update line.
  const saveRx = async (localId) => {
    const target = prescriptions.find((p) => p.localId === localId);
    if (!target) return;
    if (!target.nombre.trim() || !target.cantidad.trim() || !target.dosis.trim()) {
      showToast("Complete nombre, cantidad y dosis");
      return;
    }
    if (!patient) {
      showToast("Selecciona un paciente primero");
      return;
    }
    if (!isDraft) {
      showToast("La receta ya fue emitida");
      return;
    }

    setBusy(true);
    try {
      if (!recipeId) {
        const payload = {
          id_patient: patient.id,
          general_notes: generalNotes || undefined,
          prescriptions: [toPrescriptionPayload(target)],
        };
        const { data } = await api.post(`/api/recipes`, payload);
        const newId = data.id_recipe;
        const newPrescId = (data.prescription_ids || [])[0];
        setRecipeId(newId);
        setPrescriptions((prev) =>
          prev.map((p) =>
            p.localId === localId
              ? { ...p, serverId: newPrescId, saved: true, dirty: false }
              : p
          )
        );
        setSearchParams({ id: newId }, { replace: true });
        showToast("Borrador creado");
      } else if (!target.serverId) {
        const { data } = await api.post(
          `/api/recipes/${recipeId}/prescriptions`,
          toPrescriptionPayload(target)
        );
        setPrescriptions((prev) =>
          prev.map((p) =>
            p.localId === localId
              ? { ...p, serverId: data.id_prescription, saved: true, dirty: false }
              : p
          )
        );
        showToast("Prescripción agregada");
      } else {
        await api.put(
          `/api/recipes/${recipeId}/prescriptions/${target.serverId}`,
          toPrescriptionPayload(target)
        );
        setPrescriptions((prev) =>
          prev.map((p) =>
            p.localId === localId ? { ...p, saved: true, dirty: false } : p
          )
        );
        showToast("Prescripción actualizada");
      }
    } catch (err) {
      console.error(err);
      showToast(err?.response?.data?.error || "Error al guardar");
    } finally {
      setBusy(false);
    }
  };

  const editRx = (localId) => {
    setPrescriptions((prev) =>
      prev.map((p) => (p.localId === localId ? { ...p, saved: false } : p))
    );
  };

  const deleteRx = async (localId) => {
    const target = prescriptions.find((p) => p.localId === localId);
    if (!target) return;
    if (target.serverId && recipeId) {
      setBusy(true);
      try {
        await api.delete(
          `/api/recipes/${recipeId}/prescriptions/${target.serverId}`
        );
      } catch (err) {
        console.error(err);
        showToast(err?.response?.data?.error || "Error al eliminar");
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    setPrescriptions((prev) => {
      const updated = prev.filter((p) => p.localId !== localId);
      return updated.length ? updated : [defaultPresc()];
    });
  };

  const handleNombreChange = (localId, value) => {
    updateRx(localId, "nombre", value);
    setActiveTplLocalId(localId);
    clearTimeout(tplDebounceRef.current);
    if (!value.trim()) { setTemplateSuggestions([]); return; }
    tplDebounceRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get("/api/prescription-templates", { params: { q: value } });
        setTemplateSuggestions(data?.data || []);
      } catch { setTemplateSuggestions([]); }
    }, 300);
  };

  const selectTemplate = (localId, tpl) => {
    setPrescriptions((prev) =>
      prev.map((p) =>
        p.localId === localId
          ? { ...p, nombre: tpl.medicine_name, dosis: tpl.dosage, modoUso: tpl.usage_instructions || "", dirty: true }
          : p
      )
    );
    setTemplateSuggestions([]);
    setActiveTplLocalId(null);
  };

  const addRx = () => {
    setPrescriptions((prev) => [...prev, defaultPresc()]);
  };

  const persistNotesIfNeeded = async () => {
    if (!recipeId) return;
    try {
      await api.put(`/api/recipes/${recipeId}`, { general_notes: generalNotes });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveDraft = async (e) => {
    e?.preventDefault();
    const unsaved = prescriptions.filter(
      (p) => !p.saved && (p.nombre || p.cantidad || p.dosis)
    );
    if (unsaved.length > 0) {
      showToast("Guarda cada prescripción individualmente antes de continuar");
      return;
    }
    await persistNotesIfNeeded();
    showToast(recipeId ? "Borrador actualizado" : "Nada para guardar");
  };

  const handleIssue = async () => {
    if (!recipeId) {
      showToast("Guarda al menos una prescripción primero");
      return;
    }
    const hasSavedLine = prescriptions.some((p) => p.serverId);
    if (!hasSavedLine) {
      showToast("Agrega al menos una prescripción guardada");
      return;
    }
    setBusy(true);
    try {
      await persistNotesIfNeeded();
      const { data } = await api.post(`/api/recipes/${recipeId}/issue`);
      setStatus("ISSUED");
      setRecipeNumber(data.recipe_number);
      showToast(`Receta emitida (${data.recipe_number})`);
    } catch (err) {
      console.error(err);
      showToast(err?.response?.data?.error || "Error al emitir");
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = async () => {
    if (!recipeId || !isIssued) {
      showToast("Solo se pueden imprimir recetas emitidas");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post(`/api/recipes/${recipeId}/print`);
      setPrintDoc(data);
      setStatus((s) => (s === "ISSUED" ? "ISSUED" : s));
    } catch (err) {
      console.error(err);
      showToast(err?.response?.data?.error || "Error al imprimir");
    } finally {
      setBusy(false);
    }
  };

  const savedCount = prescriptions.filter((p) => p.saved).length;
  const canAddAnother =
    isDraft &&
    (prescriptions.length === 0 ||
      prescriptions[prescriptions.length - 1].saved);

  const todayLabel = new Date().toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="receta-page">
      <div className="page-heading">
        <h1>
          {isIssued ? "Receta emitida" : recipeId ? "Editar borrador" : "Nueva Receta Médica"}
        </h1>
        <p>
          {isIssued
            ? `N° ${recipeNumber || ""} — documento inmutable`
            : "Complete los datos del paciente y agregue las prescripciones correspondientes."}
        </p>
        {recipeId && (
          <button
            type="button"
            className="patient-banner-change"
            style={{ marginTop: 8 }}
            onClick={() => {
              setSearchParams({}, { replace: true });
              navigate("/list-recipes");
            }}
          >
            ← Volver al listado
          </button>
        )}
      </div>

      <form className="main-card" onSubmit={handleSaveDraft}>
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
                  {!recipeId && (
                    <button
                      type="button"
                      className="patient-banner-change"
                      onClick={clearPatient}
                    >
                      Cambiar
                    </button>
                  )}
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
                    <div className="field-group">
                      <label className="field-label">Observaciones generales</label>
                      <textarea
                        className="field-input"
                        rows={3}
                        disabled={!isDraft}
                        placeholder="Notas opcionales sobre la receta…"
                        value={generalNotes}
                        onChange={(e) => setGeneralNotes(e.target.value)}
                      />
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
                  <label className="field-label">Estado</label>
                  <div className="readonly-field">{status}</div>
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
                  <div key={rx.localId} className="rx-card">
                    <div className="rx-card-index">{idx + 1}</div>
                    <div className="rx-card-body">
                      <div className="rx-card-name">{rx.nombre || "—"}</div>
                      <div className="rx-card-pills">
                        {rx.cantidad && <span className="rx-pill">Cant. {rx.cantidad}</span>}
                        {rx.dosis && <span className="rx-pill">{rx.dosis}</span>}
                      </div>
                      {rx.modoUso && <div className="rx-card-usage">{rx.modoUso}</div>}
                    </div>
                    {isDraft && (
                      <div className="rx-card-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          title="Editar"
                          onClick={() => editRx(rx.localId)}
                          disabled={busy}
                        >
                          <IconEdit />
                        </button>
                        <button
                          type="button"
                          className="icon-btn danger"
                          title="Eliminar"
                          onClick={() => deleteRx(rx.localId)}
                          disabled={busy}
                        >
                          <IconTrash />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div key={rx.localId} className="rx-edit-block">
                    <div className="rx-edit-block-num">Prescripción {idx + 1}</div>
                    <div className="rx-edit-grid">
                      <div className="field-group span-2" style={{ position: "relative" }}>
                        <label className="field-label">Medicamento</label>
                        <input
                          className="field-input"
                          placeholder="Ej. Amoxicilina 500mg"
                          value={rx.nombre}
                          onChange={(e) => handleNombreChange(rx.localId, e.target.value)}
                          onBlur={() => setTimeout(() => { setTemplateSuggestions([]); setActiveTplLocalId(null); }, 150)}
                          autoComplete="off"
                        />
                        {activeTplLocalId === rx.localId && templateSuggestions.length > 0 && (
                          <ul className="rx-dropdown" style={{ top: "100%", marginTop: 4 }}>
                            {templateSuggestions.map((tpl) => (
                              <li
                                key={tpl.id}
                                className="rx-dropdown-item"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => selectTemplate(rx.localId, tpl)}
                              >
                                <div>
                                  <div className="dropdown-item-name">{tpl.medicine_name}</div>
                                  <div className="dropdown-item-meta">{tpl.dosage}</div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="field-group">
                        <label className="field-label">Cantidad</label>
                        <input
                          className="field-input"
                          placeholder="Ej. 30 cápsulas"
                          value={rx.cantidad}
                          onChange={(e) => updateRx(rx.localId, "cantidad", e.target.value)}
                        />
                      </div>
                      <div className="field-group">
                        <label className="field-label">Dosis</label>
                        <input
                          className="field-input"
                          placeholder="Ej. 1 c/8h"
                          value={rx.dosis}
                          onChange={(e) => updateRx(rx.localId, "dosis", e.target.value)}
                        />
                      </div>
                      <div className="field-group span-2">
                        <label className="field-label">Modo de uso</label>
                        <input
                          className="field-input"
                          placeholder="Instrucciones adicionales (opcional)"
                          value={rx.modoUso}
                          onChange={(e) => updateRx(rx.localId, "modoUso", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="rx-edit-actions">
                      {prescriptions.length > 1 && (
                        <button
                          type="button"
                          className="rx-delete-btn"
                          onClick={() => deleteRx(rx.localId)}
                          disabled={busy}
                        >
                          <IconTrash /> Eliminar
                        </button>
                      )}
                      <button
                        type="button"
                        className="rx-save-btn"
                        onClick={() => saveRx(rx.localId)}
                        disabled={busy}
                      >
                        <IconCheck /> Guardar
                      </button>
                    </div>
                  </div>
                )
              )}

              {isDraft && (
                <button
                  type="button"
                  className="add-rx-btn"
                  onClick={addRx}
                  disabled={!canAddAnother || busy}
                >
                  <IconPlus /> Agregar prescripción
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="card-footer">
          {isIssued ? (
            <button
              type="button"
              className="btn-primary-rx"
              onClick={handlePrint}
              disabled={busy}
            >
              <IconPrint /> Imprimir
            </button>
          ) : (
            <>
              <button
                type="submit"
                className="btn-secondary"
                disabled={busy}
              >
                <IconSave /> Guardar borrador
              </button>
              <button
                type="button"
                className="btn-primary-rx"
                onClick={handleIssue}
                disabled={busy || !recipeId}
                title={!recipeId ? "Guarda al menos una prescripción primero" : ""}
              >
                <IconCheck /> Emitir receta
              </button>
            </>
          )}
        </div>
      </form>

      {toast && (
        <div className="rx-toast">
          <span className="toast-icon"><IconCheck /></span>
          {toast}
        </div>
      )}

      {printDoc && (
        <RecipePrintView document={printDoc} onClose={() => setPrintDoc(null)} />
      )}
    </div>
  );
}
