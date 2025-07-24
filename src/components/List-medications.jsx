import React, { useState, useEffect } from "react";
import "../styles/listpacients.css";
import DeleteIcon from "../svg/delete-svgrepo-com.svg";
import EditIcon from "../svg/edit-3-svgrepo-com.svg";
import ViewIcon from "../svg/zoom-in-svgrepo-com.svg";

const MOCK_MEDICAMENTOS = [
  { id: 1, nombreMedicamento: "Actron", componente: "Ibuprofeno 400mg",   },
  { id: 2, nombreMedicamento: "amoxil", componente: "Amoxicilina 500mg",  },
  { id: 3, nombreMedicamento: "Panadol", componente: "Paracetamol 650mg", },
  { id: 4, nombreMedicamento: "Dianben", componente: "Metformina 850mg",  },
  { id: 5, nombreMedicamento: "Losec", componente: "Omeprazol 20mg",      },
];

export default function ListRecetas({ onAddMedicine, onEditMeidicine, onViewMedicine }) {
  const [medicine, setMedicine] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredRecetas, setFilteredRecetas] = useState([]);

  useEffect(() => {
  
    setMedicine(MOCK_RECETAS);
  }, []);

  useEffect(() => {
    const term = searchTerm.toLowerCase().trim();
    if (term) {
      setFilteredRecetas(
        recetas.filter(r =>
          r.nombreMedicamento.toLowerCase().includes(term) ||
          r.medicamento.toLowerCase().includes(term) ||
          r.createdAt.includes(term)
        )
      );
    } else {
      setFilteredRecetas(recetas);
    }
  }, [searchTerm, recetas]);

  const recetasToRender = searchTerm ? filteredRecetas : recetas;

  return (
    <div className="list-pacientes">
      <h2 className="paciente-titulo">Listado de Recetas</h2>
      <header className="header-list-pacientes">
        <button
          onClick={onAddReceta}
          className="btn btn-addPatient"
          style={{
            backgroundColor: '#4F46E5',
            color: '#FFFFFF',
            padding: '0.5rem 1rem',
            border: 'none',
            borderRadius: '0.375rem',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4338CA'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4F46E5'}
        >
          Nueva Receta
        </button>
        <div className="search-container">
          <input
            type="text"
            placeholder="Buscar medicamento..."
            className="search-input"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </header>
      <table className="pacientes-table">
        <thead>
          <tr>
            <th>nombre</th>
            <th>componente</th>
            <th>laboratorio</th>
          </tr>
        </thead>
        <tbody>
          {recetasToRender.length === 0 ? (
            <tr>
              <td colSpan="4" style={{ textAlign: "center", fontStyle: "italic" }}>
                {searchTerm ? `No se encontraron medicamentos para "${searchTerm}"` : "No hay medicamento registradas"}
              </td>
            </tr>
          ) : (
            recetasToRender.map((receta) => (
              <tr key={receta.id}>
                <td>{receta.nombreMedicamento}</td>
                <td>{receta.medicamento}</td>
                <td>{new Date(receta.createdAt).toLocaleDateString()}</td>
                <td className="actions-cell">
                  <button className="btn btn-edit" onClick={() => onEditReceta(receta)}>
                    <img src={EditIcon} alt="Editar" width={20} height={20} />
                  </button>
                  <button className="btn btn-delete" onClick={() => {/* TODO: eliminar */}}>
                    <img src={DeleteIcon} alt="Eliminar" width={20} height={20} />
                  </button> 
                  <button className="btn btn-view" onClick={() => onViewReceta(receta)}>
                    <img src={ViewIcon} alt="Ver" width={20} height={20} />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}