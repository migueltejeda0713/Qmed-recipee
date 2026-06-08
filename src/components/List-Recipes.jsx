import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../utils/api";
import RecipePrintView from "./RecipePrintView";
import "../styles/listpacients.css";

const IconEdit = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IconEye = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const IconPrint = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>
);
const IconBan = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
  </svg>
);

const STATUS_LABEL = {
  DRAFT: "Borrador",
  ISSUED: "Emitida",
  CANCELLED: "Cancelada",
  EXPIRED: "Expirada",
};

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ListRecipes() {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [printDoc, setPrintDoc] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/recipes", {
        params: statusFilter ? { status: statusFilter } : {},
      });
      setRecipes(data?.data || []);
    } catch (err) {
      console.error(err);
      showToast("Error al cargar recetas");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, showToast]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const term = searchTerm.toLowerCase().trim();
  const filtered = term
    ? recipes.filter(
        (r) =>
          (r.patient_name || "").toLowerCase().includes(term) ||
          (r.recipe_number || "").toLowerCase().includes(term)
      )
    : recipes;

  const handleEdit = (r) => {
    if (r.status !== "DRAFT") {
      showToast("Solo los borradores son editables");
      return;
    }
    navigate(`/?id=${r.id}`);
  };

  const handleView = (r) => {
    navigate(`/?id=${r.id}`);
  };

  const handlePrint = async (r) => {
    if (r.status !== "ISSUED" && r.status !== "PRINTED") {
      showToast("Solo recetas emitidas se pueden imprimir");
      return;
    }
    try {
      const { data } = await api.post(`/api/recipes/${r.id}/print`);
      setPrintDoc(data);
    } catch (err) {
      console.error(err);
      showToast(err?.response?.data?.error || "Error al imprimir");
    }
  };

  const handleCancel = async (r) => {
    if (r.status !== "ISSUED" && r.status !== "PRINTED") {
      showToast("Solo recetas emitidas pueden anularse");
      return;
    }
    const reason = window.prompt("Motivo de anulación:");
    if (!reason || !reason.trim()) return;
    try {
      await api.post(`/api/recipes/${r.id}/cancel`, { reason: reason.trim() });
      showToast("Receta anulada");
      fetchRecipes();
    } catch (err) {
      console.error(err);
      showToast(err?.response?.data?.error || "Error al anular");
    }
  };

  return (
    <div className="list-pacientes">
      <h2 className="paciente-titulo">Listado de Recetas</h2>
      <header className="header-list-pacientes">
        <button onClick={() => navigate("/")} className="btn-primary">
          Nueva Receta
        </button>
        <div className="search-container" style={{ display: "flex", gap: 8 }}>
          <select
            className="search-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ maxWidth: 160 }}
          >
            <option value="">Todas</option>
            <option value="DRAFT">Borradores</option>
            <option value="ISSUED">Emitidas</option>
            <option value="CANCELLED">Canceladas</option>
            <option value="EXPIRED">Expiradas</option>
          </select>
          <input
            type="text"
            placeholder="Buscar receta o paciente…"
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <table className="pacientes-table">
        <thead>
          <tr>
            <th>N°</th>
            <th>Paciente</th>
            <th>Estado</th>
            <th>Líneas</th>
            <th>Emitida</th>
            <th>Creada</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan="7" style={{ textAlign: "center", fontStyle: "italic" }}>
                Cargando…
              </td>
            </tr>
          ) : filtered.length === 0 ? (
            <tr>
              <td colSpan="7" style={{ textAlign: "center", fontStyle: "italic" }}>
                {searchTerm
                  ? `No se encontraron recetas para "${searchTerm}"`
                  : "No hay recetas registradas"}
              </td>
            </tr>
          ) : (
            filtered.map((r) => (
              <tr key={r.id}>
                <td>{r.recipe_number || "—"}</td>
                <td>{r.patient_name}</td>
                <td>
                  <span className={`status-pill status-${r.status?.toLowerCase()}`}>
                    {STATUS_LABEL[r.status] || r.status}
                  </span>
                </td>
                <td>{r.line_count}</td>
                <td>{formatDate(r.issued_at)}</td>
                <td>{formatDate(r.created_at)}</td>
                <td className="actions-cell">
                  {r.status === "DRAFT" ? (
                    <button className="icon-action-btn" title="Editar" onClick={() => handleEdit(r)}>
                      <IconEdit />
                    </button>
                  ) : (
                    <button className="icon-action-btn" title="Ver" onClick={() => handleView(r)}>
                      <IconEye />
                    </button>
                  )}
                  {(r.status === "ISSUED" || r.status === "PRINTED") && (
                    <>
                      <button className="icon-action-btn" title="Imprimir" onClick={() => handlePrint(r)}>
                        <IconPrint />
                      </button>
                      <button className="icon-action-btn icon-action-danger" title="Anular" onClick={() => handleCancel(r)}>
                        <IconBan />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {printDoc && (
        <RecipePrintView document={printDoc} onClose={() => setPrintDoc(null)} />
      )}

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "#111",
            color: "#fff",
            padding: "10px 16px",
            borderRadius: 8,
            zIndex: 9000,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
