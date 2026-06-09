import React, { useState, forwardRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/listpacients.css";
import Loading from "./Loading";
import DeleteIcon from "../svg/delete-svgrepo-com.svg";
import EditIcon from "../svg/edit-3-svgrepo-com.svg";
import ViewIcon from "../svg/zoom-in-svgrepo-com.svg";
import SearchIcon from "../svg/search-left-1504-svgrepo-com.svg";
import { API_URL, apiFetch } from "../utils/api";
import PacienteDetalleModal from "../components/Pacientdetails";
import { getAllPacientes, savePacientes } from "../utils/indexedDB";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { usePaginatedList } from "../hooks/usePaginatedList";

const IconCheck = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const ListPacients = forwardRef((props, ref) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [showDetalle, setShowDetalle] = useState(false);
  const [detallePaciente, setDetallePaciente] = useState(null);
  const [moduleAnimation, setModuleAnimation] = useState(false);

  const { toRender, setItems, loading, loadDuration, hasMore, page, searchTerm, setSearchTerm, fetchItems, refresh } =
    usePaginatedList({
      ref,
      fetchUrl: "/api/pacientes_pag",
      searchUrl: "/api/searchpacient",
      searchParam: "name",
      idField: "id",
      onInit: getAllPacientes,
      onFetched: savePacientes,
    });

  const handleInactivar = (id) =>
    confirmDialog({
      message: "¿Estás seguro de que deseas inactivar este paciente?",
      header: "Inactivar paciente",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Inactivar",
      rejectLabel: "Cancelar",
      accept: async () => {
        try {
          setItems((prev) => prev.map((p) => p.id === id ? { ...p, is_active: false } : p));
          const res = await apiFetch(`${API_URL}/api/deletepacient/${id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
          });
          if (!res.ok) throw new Error();
        } catch {
          alert("No se pudo inactivar el paciente.");
          refresh();
        }
      },
    });

  const handleActivar = (id) =>
    confirmDialog({
      message: "¿Deseas activar este paciente nuevamente?",
      header: "Activar paciente",
      icon: "pi pi-check-circle",
      acceptLabel: "Activar",
      rejectLabel: "Cancelar",
      accept: async () => {
        try {
          setItems((prev) => prev.map((p) => p.id === id ? { ...p, is_active: true } : p));
          const res = await apiFetch(`${API_URL}/api/activatepacient/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
          });
          if (!res.ok) throw new Error();
        } catch {
          alert("No se pudo activar el paciente.");
          refresh();
        }
      },
    });

  return (
    <div className="list-pacientes">
      <h2 className="paciente-titulo">Lista de Pacientes</h2>
      <header className="header-list-pacientes">
        <button
          className="btn-primary"
          onClick={() => navigate("/addpacient", { state: { background: location } })}
        >
          Agregar Paciente
        </button>
        <div className="search-container">
          <input
            type="text"
            placeholder="Buscar paciente..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <label className="search-icon-container">
            <img src={SearchIcon} alt="Buscar" className="search-icon" />
          </label>
        </div>
      </header>

      <table className="pacientes-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Edad</th>
            <th>Cédula</th>
            <th>Teléfono</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {toRender.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ textAlign: "center", fontStyle: "italic" }}>
                {searchTerm.trim()
                  ? `No se encontraron pacientes para "${searchTerm}"`
                  : "No hay pacientes registrados"}
              </td>
            </tr>
          ) : (
            toRender.map((paciente) => (
              <tr key={paciente.id} className={paciente.is_active === false ? "row-inactive" : ""}>
                <td>{paciente.name}</td>
                <td>{paciente.age}</td>
                <td>{paciente.document_id}</td>
                <td>{paciente.phone}</td>
                <td>
                  <span className={`status-pill ${paciente.is_active === false ? "status-inactive" : "status-active"}`}>
                    {paciente.is_active === false ? "Inactivo" : "Activo"}
                  </span>
                </td>
                <td className="actions-cell">
                  <button
                    className="btn btn-view"
                    onClick={(e) => {
                      e?.preventDefault();
                      setDetallePaciente(paciente);
                      setShowDetalle(true);
                      setModuleAnimation(true);
                    }}
                  >
                    <img src={ViewIcon} alt="Ver" width={20} height={20} />
                  </button>
                  {paciente.is_active !== false && (
                    <button
                      className="btn btn-edit"
                      onClick={() =>
                        navigate("/editpacient", { state: { paciente, background: location } })
                      }
                    >
                      <img src={EditIcon} alt="Editar" width={20} height={20} />
                    </button>
                  )}
                  {paciente.is_active === false ? (
                    <button className="btn btn-activate" title="Activar" onClick={() => handleActivar(paciente.id)}>
                      <IconCheck />
                    </button>
                  ) : (
                    <button className="btn btn-delete" title="Inactivar" onClick={() => handleInactivar(paciente.id)}>
                      <img src={DeleteIcon} alt="Inactivar" width={20} height={20} />
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {loading && <Loading duration={loadDuration} />}

      {!searchTerm.trim() && hasMore && !loading && (
        <div className="btn-more-container">
          <button className="btn btn-more" onClick={() => fetchItems(page + 1)}>
            Ver más
          </button>
        </div>
      )}

      <ConfirmDialog />

      {showDetalle && (
        <PacienteDetalleModal
          paciente={detallePaciente}
          setShowDetalle={setShowDetalle}
          moduleAnimation={moduleAnimation}
        />
      )}
    </div>
  );
});

export default ListPacients;
