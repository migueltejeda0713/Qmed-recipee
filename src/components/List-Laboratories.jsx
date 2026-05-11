import React, { forwardRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/listlaboratories.css";
import Loading from "./Loading";
import DeleteIcon from "../svg/delete-svgrepo-com.svg";
import EditIcon from "../svg/edit-3-svgrepo-com.svg";
import ViewIcon from "../svg/zoom-in-svgrepo-com.svg";
import SearchIcon from "../svg/search-left-1504-svgrepo-com.svg";
import { API_URL, apiFetch } from "../utils/api";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { usePaginatedList } from "../hooks/usePaginatedList";

const ListLaboratories = forwardRef((props, ref) => {
  const navigate = useNavigate();
  const location = useLocation();

  const { toRender, setItems, loading, loadDuration, hasMore, page, searchTerm, setSearchTerm, fetchItems, refresh } =
    usePaginatedList({
      ref,
      fetchUrl: "/api/laboratorios_pag",
      searchUrl: "/api/searchlaboratorio",
      searchParam: "name",
      idField: "id_laboratory",
    });

  const handleDelete = async (id) => {
    try {
      setItems((prev) => prev.filter((p) => p.id_laboratory !== id));
      const res = await apiFetch(`${API_URL}/api/deletelaboratorio/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error();
    } catch {
      alert("No se pudo eliminar el laboratorio.");
      refresh();
    }
  };

  const confirmDelete = (id) =>
    confirmDialog({
      message: "¿Estás seguro de que deseas inactivar este laboratorio?",
      header: "Inactivar laboratorio",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Inactivar",
      rejectLabel: "Cancelar",
      accept: () => handleDelete(id),
    });

  return (
    <div className="list-laboratorios">
      <h2 className="laboratorio-titulo">Lista de Laboratorios</h2>
      <header className="header-list-laboratorios">
        <button
          className="btn-primary"
          onClick={() => navigate("/laboratorios/add", { state: { background: location } })}
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
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {toRender.length === 0 ? (
            <tr>
              <td colSpan="2" style={{ textAlign: "center", fontStyle: "italic" }}>
                {searchTerm.trim()
                  ? `No se encontraron laboratorios para "${searchTerm}"`
                  : "No hay laboratorios registrados"}
              </td>
            </tr>
          ) : (
            toRender.map((laboratorio) => (
              <tr key={laboratorio.id_laboratory}>
                <td>{laboratorio.laboratory_name}</td>
                <td className="actions-cell">
                  <button
                    className="btn btn-edit"
                    onClick={() =>
                      navigate("/editlaboratorio", { state: { laboratorio, background: location } })
                    }
                  >
                    <img src={EditIcon} alt="Editar" width={20} height={20} />
                  </button>
                  <button
                    className="btn btn-delete"
                    onClick={() => confirmDelete(laboratorio.id_laboratory)}
                  >
                    <img src={DeleteIcon} alt="Inactivar" width={20} height={20} />
                  </button>
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
