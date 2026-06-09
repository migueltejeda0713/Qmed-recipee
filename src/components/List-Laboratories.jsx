import React, { forwardRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useModal } from "../context/ModalContext";
import "../styles/listlaboratories.css";
import "../styles/listpacients.css";
import Loading from "./Loading";
import DeleteIcon from "../svg/delete-svgrepo-com.svg";
import EditIcon from "../svg/edit-3-svgrepo-com.svg";
import ViewIcon from "../svg/zoom-in-svgrepo-com.svg";
import SearchIcon from "../svg/search-left-1504-svgrepo-com.svg";
import { API_URL, apiFetch } from "../utils/api";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { usePaginatedList } from "../hooks/usePaginatedList";

const IconCheck = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const ListLaboratories = forwardRef((props, ref) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { openModal, closeModal } = useModal();

  const { toRender, setItems, loading, loadDuration, hasMore, page, searchTerm, setSearchTerm, fetchItems, refresh } =
    usePaginatedList({
      ref,
      fetchUrl: "/api/laboratorios_pag",
      searchUrl: "/api/searchlaboratorio",
      searchParam: "name",
      idField: "id_laboratory",
    });

  const handleInactivar = (id) =>
    confirmDialog({
      message: "¿Estás seguro de que deseas inactivar este laboratorio?",
      header: "Inactivar laboratorio",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Inactivar",
      rejectLabel: "Cancelar",
      accept: async () => {
        try {
          setItems((prev) => prev.map((l) => l.id_laboratory === id ? { ...l, is_active: false } : l));
          const res = await apiFetch(`${API_URL}/api/deletelaboratorio/${id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
          });
          if (!res.ok) throw new Error();
        } catch {
          alert("No se pudo inactivar el laboratorio.");
          refresh();
        }
      },
    });

  const handleActivar = (id) =>
    confirmDialog({
      message: "¿Deseas activar este laboratorio nuevamente?",
      header: "Activar laboratorio",
      icon: "pi pi-check-circle",
      acceptLabel: "Activar",
      rejectLabel: "Cancelar",
      accept: async () => {
        try {
          setItems((prev) => prev.map((l) => l.id_laboratory === id ? { ...l, is_active: true } : l));
          const res = await apiFetch(`${API_URL}/api/activatelaboratorio/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
          });
          if (!res.ok) throw new Error();
        } catch {
          alert("No se pudo activar el laboratorio.");
          refresh();
        }
      },
    });

  return (
    <div className="list-laboratorios">
      <h2 className="laboratorio-titulo">Lista de Laboratorios</h2>
      <header className="header-list-laboratorios">
        <button
          className="btn-primary"
          onClick={() => openModal("add-laboratory", {
            onLaboratorioGuardado: () => { closeModal(); fetchItems(1); },
          })}
        >
          Agregar Laboratorio
        </button>
        <div className="search-container">
          <input
            type="text"
            placeholder="Buscar laboratorio..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <label className="search-icon-container">
            <img src={SearchIcon} alt="Buscar" className="search-icon" />
          </label>
        </div>
      </header>

      <table className="laboratorios-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {toRender.length === 0 ? (
            <tr>
              <td colSpan="3" style={{ textAlign: "center", fontStyle: "italic" }}>
                {searchTerm.trim()
                  ? `No se encontraron laboratorios para "${searchTerm}"`
                  : "No hay laboratorios registrados"}
              </td>
            </tr>
          ) : (
            toRender.map((laboratorio) => (
              <tr key={laboratorio.id_laboratory} className={laboratorio.is_active === false ? "row-inactive" : ""}>
                <td>{laboratorio.laboratory_name}</td>
                <td>
                  <span className={`status-pill ${laboratorio.is_active === false ? "status-inactive" : "status-active"}`}>
                    {laboratorio.is_active === false ? "Inactivo" : "Activo"}
                  </span>
                </td>
                <td className="actions-cell">
                  {laboratorio.is_active !== false && (
                    <button
                      className="btn btn-edit"
                      onClick={() =>
                        navigate("/editlaboratorio", { state: { laboratorio, background: location } })
                      }
                    >
                      <img src={EditIcon} alt="Editar" width={20} height={20} />
                    </button>
                  )}
                  <button
                    className="btn btn-view"
                    onClick={() =>
                      navigate("/viewlaboratorio", {
                        state: { laboratorio, background: location },
                      })
                    }
                  >
                    <img src={ViewIcon} alt="Ver datos" width={20} height={20} />
                  </button>
                  {laboratorio.is_active === false ? (
                    <button className="btn btn-activate" title="Activar" onClick={() => handleActivar(laboratorio.id_laboratory)}>
                      <IconCheck />
                    </button>
                  ) : (
                    <button
                      className="btn btn-delete"
                      title="Inactivar"
                      onClick={() => handleInactivar(laboratorio.id_laboratory)}
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

      {loading && <Loading duration={loadDuration} />}

      {!searchTerm.trim() && hasMore && !loading && (
        <div className="btn-more-container">
          <button className="btn btn-more" onClick={() => fetchItems(page + 1)}>
            Ver más
          </button>
        </div>
      )}

      <ConfirmDialog />
    </div>
  );
});

export default ListLaboratories;
