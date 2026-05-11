import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../utils/api";
import RecipePrintView from "./RecipePrintView";
import "../styles/listpacients.css";

const STATUS_LABEL = {
  DRAFT: "Borrador",
  ISSUED: "Emitida",
  PRINTED: "Impresa",
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
                <td className="actions-cell" style={{ display: "flex", gap: 6 }}>
                  {r.status === "DRAFT" ? (
                    <button className="btn btn-edit" onClick={() => handleEdit(r)}>
                      Editar
                    </button>
                  ) : (
                    <button className="btn btn-view" onClick={() => handleView(r)}>
                      Ver
                    </button>
                  )}
                  {(r.status === "ISSUED" || r.status === "PRINTED") && (
                    <>
                      <button className="btn btn-view" onClick={() => handlePrint(r)}>
                        Imprimir
                      </button>
                      <button className="btn btn-delete" onClick={() => handleCancel(r)}>
                        Anular
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
