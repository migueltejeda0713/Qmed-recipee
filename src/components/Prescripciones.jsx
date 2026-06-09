import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../utils/api";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import NuevaPrescripcionModal from "./NuevaPrescripcionModal";
import DeleteIcon from "../svg/delete-svgrepo-com.svg";
import SearchIcon from "../svg/search-left-1504-svgrepo-com.svg";
import "../styles/Prescripciones.css";
import "../styles/listpacients.css";

const IconCheck = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Prescripciones() {
  const location = useLocation();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (location.state?.openNew) {
      setShowModal(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchTemplates = useCallback(async (q = "") => {
    setLoading(true);
    try {
      const params = q.trim() ? { q: q.trim() } : {};
      const { data } = await api.get("/api/prescription-templates", { params });
      setTemplates(data?.data || []);
    } catch {
      showToast("Error al cargar prescripciones");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleSearch = (value) => {
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchTemplates(value), 350);
  };

  const handleGuardada = (nueva) => {
    setTemplates((prev) => [{ ...nueva, is_active: true }, ...prev]);
    setShowModal(false);
    showToast("Prescripción guardada");
  };

  const handleInactivar = (t) => {
    confirmDialog({
      message: `¿Inactivar la prescripción de "${t.medicine_name}"? Seguirá en el historial pero no aparecerá al buscar.`,
      header: "Inactivar prescripción",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Inactivar",
      rejectLabel: "Cancelar",
      accept: async () => {
        try {
          setTemplates((prev) => prev.map((x) => x.id === t.id ? { ...x, is_active: false } : x));
          await api.put(`/api/prescription-templates/${t.id}/inactivate`);
        } catch {
          showToast("No se pudo inactivar la prescripción.");
          fetchTemplates(search);
        }
      },
    });
  };

  const handleActivar = (t) => {
    confirmDialog({
      message: `¿Activar nuevamente la prescripción de "${t.medicine_name}"?`,
      header: "Activar prescripción",
      icon: "pi pi-check-circle",
      acceptLabel: "Activar",
      rejectLabel: "Cancelar",
      accept: async () => {
        try {
          setTemplates((prev) => prev.map((x) => x.id === t.id ? { ...x, is_active: true } : x));
          await api.put(`/api/prescription-templates/${t.id}/activate`);
        } catch {
          showToast("No se pudo activar la prescripción.");
          fetchTemplates(search);
        }
      },
    });
  };

  return (
    <div className="prescripciones-page">
      <h2 className="paciente-titulo" style={{ margin: 0 }}>Mis prescripciones</h2>

      <div className="header-list-pacientes">
        <button className="btn btn-addPatient" onClick={() => setShowModal(true)}>
          Agregar prescripción
        </button>
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por medicamento…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
          <label className="search-icon-container">
            <img src={SearchIcon} alt="Buscar" className="search-icon" />
          </label>
        </div>
        <span className="presc-list-count">
          {!loading && `${templates.length} prescripción${templates.length !== 1 ? "es" : ""}`}
        </span>
      </div>

      <table className="pacientes-table">
        <thead>
          <tr>
            <th>Medicamento</th>
            <th>Dosis</th>
            <th>Cantidad</th>
            <th>Instrucciones de uso</th>
            <th>Estado</th>
            <th>Guardada</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan="7" style={{ textAlign: "center", fontStyle: "italic" }}>Cargando…</td>
            </tr>
          ) : templates.length === 0 ? (
            <tr>
              <td colSpan="7" style={{ textAlign: "center", fontStyle: "italic" }}>
                {search ? `Sin resultados para "${search}"` : "Aún no tienes prescripciones guardadas"}
              </td>
            </tr>
          ) : (
            templates.map((t) => (
              <tr key={t.id} className={t.is_active === false ? "row-inactive" : ""}>
                <td><strong>{t.medicine_name}</strong></td>
                <td>{t.dosage}</td>
                <td style={{ color: "var(--text-muted)" }}>{t.quantity || "—"}</td>
                <td style={{ color: "var(--text-muted)" }}>{t.usage_instructions || "—"}</td>
                <td>
                  <span className={`status-pill ${t.is_active === false ? "status-inactive" : "status-active"}`}>
                    {t.is_active === false ? "Inactiva" : "Activa"}
                  </span>
                </td>
                <td>{formatDate(t.created_at)}</td>
                <td className="actions-cell">
                  {t.is_active === false ? (
                    <button
                      className="btn btn-activate"
                      title="Activar"
                      onClick={() => handleActivar(t)}
                    >
                      <IconCheck />
                    </button>
                  ) : (
                    <button
                      className="btn btn-delete"
                      title="Inactivar"
                      onClick={() => handleInactivar(t)}
                    >
                      <img src={DeleteIcon} alt="Inactivar" width={20} height={20} />
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {showModal && (
        <NuevaPrescripcionModal
          onClose={() => setShowModal(false)}
          onGuardada={handleGuardada}
        />
      )}

      <ConfirmDialog />

      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24,
          background: "#111", color: "#fff",
          padding: "10px 16px", borderRadius: 8, zIndex: 9000,
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
