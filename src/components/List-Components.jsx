// src/components/ListComponents.jsx
import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import "../styles/listcomponents.css";
import Loading from "./Loading";
import SearchIcon from "../svg/search-left-1504-svgrepo-com.svg";
import DeleteIcon from "../svg/delete-svgrepo-com.svg";
import Component from "./component";
import { API_URL } from "../utils/api";
import { ConfirmDialog } from "primereact/confirmdialog";
import { confirmDialog } from "primereact/confirmdialog";
import Draggable from "react-draggable";

const ListComponents = forwardRef((props, ref) => {
  const [components, setComponents] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadDuration, setLoadDuration] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredComponents, setFilteredComponents] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [moduleAnimation, setModuleAnimation] = useState(false);
  const modalRef = useRef(null);

  const getToken = () => localStorage.getItem("token") || "";

  const fetchComponents = async (nextPage = 1) => {
    if (loading) return;
    setLoading(true);
    const start = performance.now();
    const token = getToken();

    try {
      const res = await fetch(
        `${API_URL}/api/getcomponentes?page=${nextPage}&limit=10`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Error cargando componentes");
      const data = (await res.json()) || [];

      if (nextPage === 1) {
        setComponents(data);
        setHasMore(data.length >= 10);
      } else {
        setHasMore(data.length >= 10);
        setComponents(prev => [
          ...prev,
          ...data.filter(c => !prev.some(p => p.id_componente === c.id_componente)),
        ]);
      }
      setPage(nextPage);
    } catch (err) {
      console.error("Error al obtener componentes:", err);
    } finally {
      setLoadDuration(performance.now() - start);
      setLoading(false);
    }
  };

  const searchComponents = async (q) => {
    const token = getToken();
    try {
      const res = await fetch(
        `${API_URL}/api/searchcomponente?q=${encodeURIComponent(q)}&limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = (await res.json()) || [];
      setFilteredComponents(data);
      setHasMore(false);
    } catch {
      setFilteredComponents([]);
    }
  };

  useImperativeHandle(ref, () => ({
    refreshComponents: () => {
      setComponents([]);
      setPage(1);
      setHasMore(true);
      fetchComponents(1);
    },
  }));

  useEffect(() => {
    fetchComponents(1);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim()) searchComponents(searchTerm);
      else {
        setFilteredComponents([]);
        setHasMore(true);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const toRender =
    searchTerm.trim() && filteredComponents.length
      ? filteredComponents
      : components;

  const handleDelete = (id) => {
    confirmDialog({
      message: "¿Seguro que deseas eliminar este componente?",
      header: "Eliminar componente",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Eliminar",
      rejectLabel: "Cancelar",
      accept: async () => {
        const token = getToken();
        try {
          const res = await fetch(`${API_URL}/api/deletecomponente/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error();
          setComponents(prev => prev.filter(c => c.id_componente !== id));
        } catch {
          alert("Error al eliminar el componente.");
        }
      },
    });
  };

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
            onChange={e => setSearchTerm(e.target.value)}
          />
          <label className="search-components-icon">
            <img src={SearchIcon} alt="Buscar" width={16} height={16} />
          </label>
        </div>
      </header>

      <table className="components-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {toRender.length === 0 ? (
            <tr>
              <td colSpan="3" className="no-components-data">
                {searchTerm
                  ? `No se encontraron para "${searchTerm}"`
                  : "No hay componentes registrados"}
              </td>
            </tr>
          ) : (
            toRender.map(c => (
              <tr key={c.id_componente}>
                <td>{c.id_componente}</td>
                <td>{c.nombre}</td>
                <td className="components-actions-cell">
                  <button
                    className="btn btn-delete"
                    onClick={() => handleDelete(c.id_componente)}
                  >
                    <img
                      src={DeleteIcon}
                      alt="Eliminar"
                      width={18}
                      height={18}
                      style={{ pointerEvents: "none", verticalAlign: "middle" }}
                    />
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
          <button
            className="btn-more-components"
            onClick={() => fetchComponents(page + 1)}
          >
            Ver más
          </button>
        </div>
      )}

      <ConfirmDialog />

      {showModal && (
        <Draggable nodeRef={modalRef} handle=".components-title">
          <div ref={modalRef}>
            <Component
              onClose={() => { setShowModal(false); setModuleAnimation(false); fetchComponents(1); }}
              moduleAnimation={moduleAnimation}
            />
          </div>
        </Draggable>
      )}
    </div>
  );
});

export default ListComponents;
