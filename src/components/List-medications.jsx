import { forwardRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useModal } from "../context/ModalContext";
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

const ListMedicines = forwardRef((_props, ref) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { openModal, closeModal } = useModal();

  const { toRender, setItems, loading, loadDuration, hasMore, page, searchTerm, setSearchTerm, fetchItems } =
    usePaginatedList({
      ref,
      fetchUrl: "/api/getmedicines",
      searchUrl: "/api/searchmedicamento",
      searchParam: "name",
      idField: "id_medicine",
    });

  const handleInactivar = (id) =>
    confirmDialog({
      message: "¿Estás seguro de que deseas inactivar este medicamento?",
      header: "Inactivar medicamento",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Inactivar",
      rejectLabel: "Cancelar",
      accept: async () => {
        try {
          setItems((prev) => prev.map((m) => m.id_medicine === id ? { ...m, is_active: false } : m));
          const res = await apiFetch(`${API_URL}/api/deletemedicamento/${id}`, {
            method: "DELETE",
          });
          if (!res.ok) throw new Error();
        } catch {
          alert("No se pudo inactivar el medicamento.");
          fetchItems(1);
        }
      },
    });

  const handleActivar = (id) =>
    confirmDialog({
      message: "¿Deseas activar este medicamento nuevamente?",
      header: "Activar medicamento",
      icon: "pi pi-check-circle",
      acceptLabel: "Activar",
      rejectLabel: "Cancelar",
      accept: async () => {
        try {
          setItems((prev) => prev.map((m) => m.id_medicine === id ? { ...m, is_active: true } : m));
          const res = await apiFetch(`${API_URL}/api/activatemedicamento/${id}`, {
            method: "PUT",
          });
          if (!res.ok) throw new Error();
        } catch {
          alert("No se pudo activar el medicamento.");
          fetchItems(1);
        }
      },
    });

  return (
    <div className="list-pacientes">
      <h2 className="paciente-titulo">Lista de Medicamentos</h2>
      <header className="header-list-pacientes">
        <button
          className="btn btn-addPatient"
          onClick={() => openModal("add-medicine", {
            onMedicamentoGuardado: () => { closeModal(); fetchItems(1); },
          })}
        >
          Agregar medicamento
        </button>
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
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {toRender.length === 0 ? (
            <tr>
              <td colSpan="5" style={{ textAlign: "center", fontStyle: "italic" }}>
                {searchTerm.trim()
                  ? `No se encontraron medicamentos para "${searchTerm}"`
                  : "No hay medicamentos registrados"}
              </td>
            </tr>
          ) : (
            toRender.map((med) => (
              <tr key={med.id_medicine} className={med.is_active === false ? "row-inactive" : ""}>
                <td>{med.medicine_name}</td>
                <td>{med.component_name}</td>
                <td>{med.laboratory_name}</td>
                <td>
                  <span className={`status-pill ${med.is_active === false ? "status-inactive" : "status-active"}`}>
                    {med.is_active === false ? "Inactivo" : "Activo"}
                  </span>
                </td>
                <td className="actions-cell">
                  <button
                    className="btn btn-view"
                    onClick={() =>
                      navigate("/viewmedicamento", { state: { medicamento: med, background: location } })
                    }
                  >
                    <img src={ViewIcon} alt="Ver" width={20} height={20} />
                  </button>
                  {med.is_active !== false && (
                    <button
                      className="btn btn-edit"
                      onClick={() => openModal("add-medicine", {
                        medicamento: med,
                        onMedicamentoGuardado: () => { closeModal(); fetchItems(1); },
                      })}
                    >
                      <img src={EditIcon} alt="Editar" width={20} height={20} />
                    </button>
                  )}
                  {med.is_active === false ? (
                    <button className="btn btn-activate" title="Activar" onClick={() => handleActivar(med.id_medicine)}>
                      <IconCheck />
                    </button>
                  ) : (
                    <button className="btn btn-delete" title="Inactivar" onClick={() => handleInactivar(med.id_medicine)}>
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

export default ListMedicines;
