import React, { useState, useRef, forwardRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/listcomponents.css";
import Loading from "./Loading";
import SearchIcon from "../svg/search-left-1504-svgrepo-com.svg";
import DeleteIcon from "../svg/delete-svgrepo-com.svg";
import EditIcon from "../svg/edit-3-svgrepo-com.svg";
import ViewIcon from "../svg/zoom-in-svgrepo-com.svg";
import Component from "./component";
import { API_URL, apiFetch } from "../utils/api";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import Draggable from "react-draggable";
import { usePaginatedList } from "../hooks/usePaginatedList";

const ListComponents = forwardRef((props, ref) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showModal, setShowModal] = useState(false);
  const [moduleAnimation, setModuleAnimation] = useState(false);
  const modalRef = useRef(null);

  const { toRender, setItems, loading, loadDuration, hasMore, page, searchTerm, setSearchTerm, fetchItems } =
    usePaginatedList({
      ref,
      fetchUrl: "/api/getcomponentes",
      searchUrl: "/api/searchcomponente",
      searchParam: "q",
      idField: "id_component",
    });

  const handleDelete = (id) =>
    confirmDialog({
      message: "¿Seguro que deseas inactivar este componente?",
      header: "Inactivar componente",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Inactivar",
      rejectLabel: "Cancelar",
      accept: async () => {
        try {
          const res = await apiFetch(`${API_URL}/api/deletecomponente/${id}`, {
            method: "DELETE",
          });
          if (!res.ok) throw new Error();
          setItems((prev) => prev.filter((c) => c.id_component !== id));
        } catch {
          alert("Error al eliminar el componente.");
        }
      },
    });

  return (
    <div className="list-components">
      <h2 className="components-title">Lista de Componentes</h2>

      <header className="header-list-components">
        <button
          className="btn-components btn-addComponent"
          onClick={() => { setShowModal(true); setModuleAnimation(true); }}
        >
          Agregar Componente
        </button>
        <div className="search-components-container">
          <input
            type="text"
            className="search-components-input"
            placeholder="Buscar componente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <label className="search-components-icon">
            <img src={SearchIcon} alt="Buscar" width={16} height={16} />
          </label>
        </div>
      </header>

      <table className="components-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {toRender.length === 0 ? (
            <tr>
              <td colSpan="2" className="no-components-data">
                {searchTerm
                  ? `No se encontraron para "${searchTerm}"`
                  : "No hay componentes registrados"}
              </td>
            </tr>
          ) : (
            toRender.map((c) => (
              <tr key={c.id_component}>
                <td>{c.name}</td>
                <td className="components-actions-cell actions-cell">
                  <button
                    className="btn btn-view"
                    onClick={() =>
                      navigate("/viewcomponente", { state: { componente: c, background: location } })
                    }
                  >
                    <img src={ViewIcon} alt="Ver" width={20} height={20} />
                  </button>
                  <button
                    className="btn btn-edit"
                    onClick={() =>
                      navigate("/editcomponente", { state: { componente: c, background: location } })
                    }
                  >
                    <img src={EditIcon} alt="Editar" width={20} height={20} />
                  </button>
                  <button className="btn btn-delete" onClick={() => handleDelete(c.id_component)}>
                    <img src={DeleteIcon} alt="Inactivar" width={20} height={20} />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {loading && <Loading duration={loadDuration} />}

      {!searchTerm && hasMore && !loading && (
        <div className="btn-more-components-container">
          <button className="btn-more-components" onClick={() => fetchItems(page + 1)}>
            Ver más
          </button>
        </div>
      )}

      <ConfirmDialog />

      {showModal && (
        <Draggable nodeRef={modalRef} handle=".components-title">
          <div ref={modalRef}>
            <Component
              onClose={() => { setShowModal(false); setModuleAnimation(false); fetchItems(1); }}
              moduleAnimation={moduleAnimation}
            />
          </div>
        </Draggable>
      )}
    </div>
  );
});

export default ListComponents;
