// src/components/ListPacients.jsx
import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/listpacients.css";
import Loading from "./Loading";
import DeleteIcon from "../svg/delete-svgrepo-com.svg";
import EditIcon from "../svg/edit-3-svgrepo-com.svg";
import ViewIcon from "../svg/zoom-in-svgrepo-com.svg";
import SearchIcon from "../svg/search-left-1504-svgrepo-com.svg";
import { API_URL } from "../utils/api";
import PacienteDetalleModal from "../components/Pacientdetails";
import {
  getAllPacientes,
  savePacientes,
  deletePacienteIndexed,
} from "../utils/indexedDB";
import { ConfirmDialog } from "primereact/confirmdialog";
import { confirmDialog } from "primereact/confirmdialog";

const ListPacients = forwardRef((props, ref) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [pacientes, setPacientes] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadDuration, setLoadDuration] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState({ name: "" });
  const [filteredPacientes, setFilteredPacientes] = useState([]);
  const [showDetalle, setShowDetalle] = useState(false);
  const [detallePaciente, setDetallePaciente] = useState(null);
  const [moduleAnimation, setModuleAnimation] = useState(false);

  useImperativeHandle(ref, () => ({
    refreshPacientes,
  }));

  useEffect(() => {
    getAllPacientes().then((cached) => {
      if (cached.length) setPacientes(cached);
      fetchPacientes(1, { silent: cached.length > 0 });
    });
  }, []);

  const fetchPacientes = async (nextPage = 1, { silent = false } = {}) => {
    if (loading) return;
    if (!silent) setLoading(true);
    const start = performance.now();
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(
        `${API_URL}/api/pacientes_pag?page=${nextPage}&limit=10`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) throw new Error("Error cargando pacientes");
      const data = await res.json();

      setHasMore(nextPage === 1 ? data.length >= 10 : data.length >= 10);
      await savePacientes(data);
      setPacientes((prev) =>
        nextPage === 1
          ? data
          : [
              ...prev,
              ...data.filter((p) => !prev.some((old) => old.id === p.id)),
            ]
      );
      setPage(nextPage);
    } catch (err) {
      console.error("Error al obtener pacientes:", err);
    } finally {
      const end = performance.now();
      setLoadDuration(end - start);
      if (!silent) setLoading(false);
    }
  };

  const refreshPacientes = () => {
    setPacientes([]);
    setPage(1);
    setHasMore(true);
    fetchPacientes(1);
  };

  const handleSearch = (e) => {
    setSearchTerm({ name: e.target.value });
  };

  useEffect(() => {
    const delay = setTimeout(() => {
      if (!searchTerm.name.trim()) {
        setFilteredPacientes([]);
        setHasMore(true);
        return;
      }
      const token = localStorage.getItem("token");
      fetch(
        `${API_URL}/api/searchpacient?name=${encodeURIComponent(
          searchTerm.name
        )}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      )
        .then((res) => res.json())
        .then((data) => {
          setFilteredPacientes(Array.isArray(data) ? data : []);
          setHasMore(false);
        })
        .catch((err) => {
          console.error("Error buscando pacientes:", err);
          setFilteredPacientes([]);
          setHasMore(false);
        });
    }, 300);
    return () => clearTimeout(delay);
  }, [searchTerm.name]);

  const pacientesToRender =
    searchTerm.name.trim() && filteredPacientes.length
      ? filteredPacientes
      : searchTerm.name.trim()
      ? []
      : pacientes;

  // Navegar al modal de edición, pasando el paciente y la ruta de fondo
  const handleEditPaciente = (paciente) => {
    navigate("/editpacient", {
      state: { paciente, background: location },
    });
  };

  // Navegar al modal de creación
  const handleAddPaciente = () => {
    navigate("/addpacient", {
      state: { background: location },
    });
  };

  const openDetalle = (e, paciente) => {
    e?.preventDefault();
    setDetallePaciente(paciente);
    setShowDetalle(true);
    setModuleAnimation(true);
  };

  const handleDelete = async (id) => {
    try {
      await deletePacienteIndexed(id);
      setPacientes((prev) => prev.filter((p) => p.id !== id));
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/deletepacient/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Error al eliminar paciente");
    } catch (err) {
      console.error(err);
      alert("No se pudo eliminar el paciente.");
      refreshPacientes();
    }
  };

  const confirmDelete = (id) => {
    confirmDialog({
      message: "¿Estás seguro de que deseas eliminar este paciente?",
      header: "Eliminar paciente",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Eliminar",
      rejectLabel: "Cancelar",
      accept: () => handleDelete(id),
    });
  };

  return (
    <div className="list-pacientes">
      <h2 className="paciente-titulo">Lista de Pacientes</h2>
      <header className="header-list-pacientes">
        <button
          onClick={handleAddPaciente}
          style={{
            backgroundColor: "#4F46E5",
            color: "#FFFFFF",
            padding: "0.5rem 1rem",
            border: "none",
            borderRadius: "0.375rem",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            transition: "background-color 0.2s ease",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "#4338CA")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "#4F46E5")
          }
        >
          Agregar Paciente
        </button>
        <div className="search-container">
          <input
            type="text"
            placeholder="Buscar paciente..."
            className="search-input"
            value={searchTerm.name}
            onChange={handleSearch}
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
          {pacientesToRender.length === 0 ? (
            <tr>
              <td
                colSpan="5"
                style={{ textAlign: "center", fontStyle: "italic" }}
              >
                {searchTerm.name.trim()
                  ? `No se encontraron pacientes para "${searchTerm.name}"`
                  : "No hay pacientes registrados"}
              </td>
            </tr>
          ) : (
            pacientesToRender.map((paciente) => (
              <tr key={paciente.id}>
                <td>{paciente.name}</td>
                <td>{paciente.age}</td>
                <td>{paciente.document_id}</td>
                <td>{paciente.phone}</td>
                <td className="actions-cell">
                  <button
                    className="btn btn-edit"
                    onClick={() => handleEditPaciente(paciente)}
                  >
                    <img src={EditIcon} alt="Editar" width={20} height={20} />
                  </button>
                  <button
                    className="btn btn-delete"
                    onClick={() => confirmDelete(paciente.id)}
                  >
                    <img
                      src={DeleteIcon}
                      alt="Eliminar"
                      width={20}
                      height={20}
                    />
                  </button>
                  <button
                    className="btn btn-view"
                    onClick={(e) => openDetalle(e, paciente)}
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

      {!searchTerm.name.trim() && hasMore && !loading && (
        <div className="btn-more-container">
          <button
            className="btn btn-more"
            onClick={() => fetchPacientes(page + 1)}
          >
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
