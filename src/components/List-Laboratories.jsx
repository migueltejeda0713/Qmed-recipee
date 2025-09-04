// src/components/ListLaboratories.jsx
import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/listlaboratories.css";
import Loading from "./Loading";

import { getAllLaboratorios, saveLaboratorios, deletePacienteIndexed } from "../utils/indexedDB";
import DeleteIcon from "../svg/delete-svgrepo-com.svg";
import EditIcon from "../svg/edit-3-svgrepo-com.svg";
import ViewIcon from "../svg/zoom-in-svgrepo-com.svg";
import SearchIcon from "../svg/search-left-1504-svgrepo-com.svg";
import { API_URL } from "../utils/api";


import { ConfirmDialog } from "primereact/confirmdialog";
import { confirmDialog } from "primereact/confirmdialog";

const ListLaboratories = forwardRef((props, ref) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [laboratorios, setLaboratorios] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadDuration, setLoadDuration] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState({ name: "" });
  const [filteredLaboratorios, setFilteredLaboratorios] = useState([]);
  const [showDetalle, setShowDetalle] = useState(false);
  const [detalleLaboratorio, setDetalleLaboratorio] = useState(null);
  const [moduleAnimation, setModuleAnimation] = useState(false);

  useImperativeHandle(ref, () => ({
    refreshLaboratorios,
  }));

  useEffect(() => {
    getAllLaboratorios().then((cached) => {
      if (cached.length) setLaboratorios(cached);
      fetchLaboratorios(1, { silent: cached.length > 0 });
    });
  }, []);

  const fetchLaboratorios = async (nextPage = 1, { silent = false } = {}) => {
    if (loading) return;
    if (!silent) setLoading(true);
    const start = performance.now();
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(
        `${API_URL}/api/getlaboratorios`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) throw new Error("Error cargando laboratorios");
      const data = await res.json();

      setHasMore(nextPage === 1 ? data.length >= 10 : data.length >= 10);
      await saveLaboratorios(data);
      setLaboratorios((prev) =>
        nextPage === 1
          ? data
          : [
              ...prev,
              ...data.filter((p) => !prev.some((old) => old.id === p.id)),
            ]
      );
      setPage(nextPage);
    } catch (err) {
      console.error("Error al obtener laboratorios:", err);
    } finally {
      const end = performance.now();
      setLoadDuration(end - start);
      if (!silent) setLoading(false);
    }
  };

  const refreshLaboratorios = () => {
    setLaboratorios([]);
    setPage(1);
    setHasMore(true);
    fetchLaboratorios(1);
  };

  const handleSearch = (e) => {
    setSearchTerm({ name: e.target.value });
  };

  useEffect(() => {
    const delay = setTimeout(() => {
      if (!searchTerm.name.trim()) {
        setFilteredLaboratorios([]);
        setHasMore(true);
        return;
      }
      const token = localStorage.getItem("token");
      fetch(
        `${API_URL}/api/searchlaboratorio?name=${encodeURIComponent(
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
          setFilteredLaboratorios(Array.isArray(data) ? data : []);
          setHasMore(false);
        })
        .catch((err) => {
          console.error("Error buscando laboratorios:", err);
          setFilteredLaboratorios([]);
          setHasMore(false);
        });
    }, 300);
    return () => clearTimeout(delay);
  }, [searchTerm.name]);

  const laboratoriosToRender =
    searchTerm.name.trim() && filteredLaboratorios.length
      ? filteredLaboratorios
      : searchTerm.name.trim()
      ? []
      : laboratorios;

  // Navegar al modal de edición, pasando el laboratorio y la ruta de fondo
  const handleEditLaboratorio = (laboratorio) => {
    navigate("/editlaboratorio", {
      state: { laboratorio, background: location },
    });
  };

  // Navegar al modal de creación
  const handleAddLaboratorio = () => {
    navigate("/addlaboratorio", {
      state: { background: location },
    });
  };

  const openDetalle = (e, laboratorio) => {
    e?.preventDefault();
    setDetalleLaboratorio(laboratorio);
    setShowDetalle(true);
    setModuleAnimation(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteLaboratorioIndexed(id);
      setLaboratorios((prev) => prev.filter((p) => p.id !== id));
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/deletelaboratorio/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Error al eliminar laboratorio");
    } catch (err) {
      console.error(err);
      alert("No se pudo eliminar el laboratorio.");
      refreshLaboratorios();
    }
  };

  const confirmDelete = (id) => {
    confirmDialog({
      message: "¿Estás seguro de que deseas eliminar este laboratorio?",
      header: "Eliminar laboratorio",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Eliminar",
      rejectLabel: "Cancelar",
      accept: () => handleDelete(id),
    });
  };

  return (
    <div className="list-laboratorios">
      <h2 className="laboratorio-titulo">Lista de Laboratorios</h2>
      <header className="header-list-laboratorios">
        <button
          onClick={handleAddLaboratorio}
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
          Agregar Laboratorio
        </button>
        <div className="search-container">
          <input
            type="text"
            placeholder="Buscar laboratorio..."
            className="search-input"
            value={searchTerm.name}
            onChange={handleSearch}
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
          {laboratoriosToRender.length === 0 ? (
            <tr>
              <td
                colSpan="2"
                style={{ textAlign: "center", fontStyle: "italic" }}
              >
                {searchTerm.name.trim()
                  ? `No se encontraron laboratorios para "${searchTerm.name}"`
                  : "No hay laboratorios registrados"}
              </td>
            </tr>
          ) : (
            laboratoriosToRender.map((laboratorio) => (
              <tr key={laboratorio.id_laboratorio}>
                <td>{laboratorio.nombre_laboratorio}</td>
                <td className="actions-cell">
                  <button
                    className="btn btn-edit"
                    onClick={() => handleEditLaboratorio(laboratorio)}
                  >
                    <img src={EditIcon} alt="Editar" width={20} height={20} />
                  </button>
                  <button
                    className="btn btn-delete"
                    onClick={() => confirmDelete(laboratorio.id)}
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
                    onClick={(e) => openDetalle(e, laboratorio)}
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
            onClick={() => fetchLaboratorios(page + 1)}
          >
            Ver más
          </button>
        </div>
      )}

      <ConfirmDialog />

      {showDetalle && (
        <LaboratorioDetalleModal
          laboratorio={detalleLaboratorio}
          setShowDetalle={setShowDetalle}
          moduleAnimation={moduleAnimation}
        />
      )}
    </div>
  );
});

export default ListLaboratories;