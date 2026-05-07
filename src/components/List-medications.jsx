import { forwardRef } from "react";
import "../styles/listpacients.css";
import Loading from "./Loading";
import DeleteIcon from "../svg/delete-svgrepo-com.svg";
import EditIcon from "../svg/edit-3-svgrepo-com.svg";
import ViewIcon from "../svg/zoom-in-svgrepo-com.svg";
import SearchIcon from "../svg/search-left-1504-svgrepo-com.svg";
import { API_URL } from "../utils/api";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { usePaginatedList } from "../hooks/usePaginatedList";

const ListMedicines = forwardRef((_props, ref) => {
  const { toRender, setItems, loading, loadDuration, hasMore, page, searchTerm, setSearchTerm, fetchItems } =
    usePaginatedList({
      ref,
      fetchUrl: "/api/getmedicines",
      searchUrl: "/api/searchmedicamento",
      searchParam: "name",
      idField: "id_medicine",
    });

  const handleDelete = (id) =>
    confirmDialog({
      message: "¿Estás seguro de que deseas eliminar este medicamento?",
      header: "Eliminar medicamento",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Eliminar",
      rejectLabel: "Cancelar",
      accept: async () => {
        try {
          setItems((prev) => prev.filter((m) => m.id_medicine !== id));
          const res = await fetch(`${API_URL}/api/deletemedicamento/${id}`, {
            method: "DELETE",
            credentials: "include",
          });
          if (!res.ok) throw new Error();
        } catch {
          alert("No se pudo eliminar el medicamento.");
          fetchItems(1);
        }
      },
    });

  return (
    <div className="list-pacientes">
      <h2 className="paciente-titulo">Lista de Medicamentos</h2>
      <header className="header-list-pacientes">
        <div className="search-container">
          <input
            type="text"
            placeholder="Buscar medicamento..."
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
            <th>Componente</th>
            <th>Laboratorio</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {toRender.length === 0 ? (
            <tr>
              <td colSpan="4" style={{ textAlign: "center", fontStyle: "italic" }}>
                {searchTerm.trim()
                  ? `No se encontraron medicamentos para "${searchTerm}"`
                  : "No hay medicamentos registrados"}
              </td>
            </tr>
          ) : (
            toRender.map((med) => (
              <tr key={med.id_medicine}>
                <td>{med.medicine_name}</td>
                <td>{med.component_name}</td>
                <td>{med.laboratory_name}</td>
                <td className="actions-cell">
                  <button className="btn btn-edit" onClick={() => {}}>
                    <img src={EditIcon} alt="Editar" width={20} height={20} />
                  </button>
                  <button className="btn btn-delete" onClick={() => handleDelete(med.id_medicine)}>
                    <img src={DeleteIcon} alt="Eliminar" width={20} height={20} />
                  </button>
                  <button className="btn btn-view" onClick={() => {}}>
                    <img src={ViewIcon} alt="Ver" width={20} height={20} />
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

export default ListMedicines;
