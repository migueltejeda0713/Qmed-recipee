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
import { getAllPacientes, savePacientes, deletePacienteIndexed } from "../utils/indexedDB";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { usePaginatedList } from "../hooks/usePaginatedList";

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

  const handleDelete = async (id) => {
    try {
      await deletePacienteIndexed(id);
      setItems((prev) => prev.filter((p) => p.id !== id));
      const res = await apiFetch(`${API_URL}/api/deletepacient/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error();
    } catch {
      alert("No se pudo eliminar el paciente.");
      refresh();
    }
  };

  const confirmDelete = (id) =>
    confirmDialog({
      message: "¿Estás seguro de que deseas inactivar este paciente?",
      header: "Inactivar paciente",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Inactivar",
      rejectLabel: "Cancelar",
      accept: () => handleDelete(id),
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
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {toRender.length === 0 ? (
            <tr>
              <td colSpan="5" style={{ textAlign: "center", fontStyle: "italic" }}>
                {searchTerm.trim()
                  ? `No se encontraron pacientes para "${searchTerm}"`
                  : "No hay pacientes registrados"}
              </td>
            </tr>
          ) : (
            toRender.map((paciente) => (
              <tr key={paciente.id}>
                <td>{paciente.name}</td>
                <td>{paciente.age}</td>
                <td>{paciente.document_id}</td>
                <td>{paciente.phone}</td>
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
                  <button
                    className="btn btn-edit"
                    onClick={() =>
                      navigate("/editpacient", { state: { paciente, background: location } })
                    }
                  >
                    <img src={EditIcon} alt="Editar" width={20} height={20} />
                  </button>
                  <button className="btn btn-delete" onClick={() => confirmDelete(paciente.id)}>
                    <img src={DeleteIcon} alt="Inactivar" width={20} height={20} />
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
