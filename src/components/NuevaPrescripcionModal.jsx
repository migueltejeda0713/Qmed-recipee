import React, { useState, useEffect, useRef } from "react";
import { api } from "../utils/api";
import DraggableFormModal from "./DraggableFormModal";
import "../styles/pacientes.css";

export default function NuevaPrescripcionModal({ onClose, onGuardada }) {
  const [medicine, setMedicine] = useState(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const [dosage, setDosage] = useState("");
  const [usageInstructions, setUsageInstructions] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const debounceRef = useRef(null);
  const blurRef = useRef(null);
  useEffect(() => () => { clearTimeout(debounceRef.current); clearTimeout(blurRef.current); }, []);

  // Carga 5 medicamentos recientes al abrir
  useEffect(() => {
    api.get("/api/searchmedicamento", { params: { limit: 5 } })
      .then(({ data }) => setSuggestions(data?.data || []))
      .catch(() => {});
  }, []);

  const handleQueryChange = (value) => {
    setQuery(value);
    setMedicine(null);
    setError("");
    clearTimeout(debounceRef.current);

    if (!value.trim()) {
      // Volver a mostrar los 5 recientes
      api.get("/api/searchmedicamento", { params: { limit: 5 } })
        .then(({ data }) => { setSuggestions(data?.data || []); setShowDropdown(true); })
        .catch(() => {});
      return;
    }

    debounceRef.current = setTimeout(() => {
      api.get("/api/searchmedicamento", { params: { name: value } })
        .then(({ data }) => { setSuggestions(data?.data || []); setShowDropdown(true); })
        .catch(() => setSuggestions([]));
    }, 300);
  };

  const selectMedicine = (m) => {
    setMedicine(m);
    setQuery(m.medicine_name);
    setShowDropdown(false);
    setError("");
  };

  const isValid = medicine !== null && dosage.trim() !== "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!medicine) { setError("Selecciona un medicamento de la lista."); return; }
    if (!dosage.trim()) { setError("La dosis es requerida."); return; }
    setSaving(true);
    try {
      const { data } = await api.post("/api/prescription-templates", {
        id_medicine: medicine.id_medicine,
        dosage: dosage.trim(),
        usage_instructions: usageInstructions.trim(),
      });
      onGuardada(data);
    } catch (err) {
      setError(err?.response?.data?.error || "No se pudo guardar la prescripción.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DraggableFormModal
      moduleAnimation={true}
      titleClass="paciente-titulo"
      formClass="container-paciente"
      title="Nueva prescripción"
      error={error}
      isValid={isValid}
      isLoading={saving}
      submitLabel="Guardar"
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      {/* Búsqueda de medicamento */}
      <div className="container-datos-pacientes" style={{ position: "relative" }}>
        <label className="paciente-label">Medicamento *</label>
        <input
          type="text"
          className={`paciente-input${error && !medicine ? " error-input" : ""}`}
          placeholder="Buscar medicamento…"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => { blurRef.current = setTimeout(() => setShowDropdown(false), 150); }}
          autoComplete="off"
          autoFocus
          disabled={saving}
        />
        {showDropdown && suggestions.length > 0 && (
          <ul style={{
            position: "absolute", top: "100%", left: 0, right: 0, zIndex: 200,
            background: "var(--card)", border: "1.5px solid var(--input-border)",
            borderRadius: "var(--radius-sm)", boxShadow: "var(--shadow-lg)",
            margin: "4px 0 0", padding: 0, maxHeight: 200, overflowY: "auto",
            listStyle: "none",
          }}>
            {suggestions.map((m) => (
              <li
                key={m.id_medicine}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectMedicine(m)}
                style={{
                  padding: "9px 14px", cursor: "pointer", fontSize: "0.875rem",
                  color: "var(--text-soft)", transition: "background 0.15s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--blue-light)"}
                onMouseLeave={(e) => e.currentTarget.style.background = ""}
              >
                <span style={{ fontWeight: 600 }}>{m.medicine_name}</span>
                {m.component_name && (
                  <span style={{ color: "var(--text-muted)", marginLeft: 8, fontSize: "0.75rem" }}>
                    {m.component_name}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Dosis */}
      <div className="container-datos-pacientes">
        <label className="paciente-label">Dosis *</label>
        <input
          type="text"
          className={`paciente-input${error && !dosage.trim() ? " error-input" : ""}`}
          placeholder="Ej. 1 cáp. c/8h x7 días"
          value={dosage}
          onChange={(e) => { setDosage(e.target.value); setError(""); }}
          disabled={saving}
        />
      </div>

      {/* Instrucciones */}
      <div className="container-datos-pacientes">
        <label className="paciente-label">Instrucciones de uso</label>
        <input
          type="text"
          className="paciente-input"
          placeholder="Ej. Tomar con alimentos (opcional)"
          value={usageInstructions}
          onChange={(e) => setUsageInstructions(e.target.value)}
          disabled={saving}
        />
      </div>
    </DraggableFormModal>
  );
}
