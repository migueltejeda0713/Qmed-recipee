import React, { useState, useEffect } from "react";
import "../styles/listpacients.css";
import DeleteIcon from "../svg/delete-svgrepo-com.svg";
import EditIcon from "../svg/edit-3-svgrepo-com.svg";
import ViewIcon from "../svg/zoom-in-svgrepo-com.svg";
import { API_URL } from "../utils/api";

const getToken = () => localStorage.getItem("token") || "";

export default function ListMedicines({ onAddMedicine, onEditMedicine, onViewMedicine }) {
  const [medicines, setMedicines] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredMedicines, setFilteredMedicines] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getToken();
    fetch(`${API_URL}/api/getmedicines`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Error fetching medicines");
        return res.json();
      })
      .then((data) => setMedicines(data))
      .catch((err) => {
        console.error("Error:", err);
        setError("Error cargando medicamentos.");
      });
  }, []);

  useEffect(() => {
    const term = searchTerm.toLowerCase().trim();
    if (term) {
      setFilteredMedicines(
        medicines.filter((m) =>
          m.medicine_name.toLowerCase().includes(term)
        )
      );
    } else {
      setFilteredMedicines(medicines);
    }
  }, [searchTerm, medicines]);

  const listToRender = searchTerm ? filteredMedicines : medicines;

  return (
    <div className="list-pacientes">
      <h2 className="paciente-titulo">Medicines List</h2>
      <header className="header-list-pacientes">
        <button
          onClick={onAddMedicine}
          className="btn btn-addPatient"
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
          Add Medicine
        </button>
        <div className="search-container">
          <input
            type="text"
            placeholder="Search medicine..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      {error && (
        <div className="error-message" style={{ margin: "1rem 0", textAlign: "center" }}>
          ⚠️ {error}
        </div>
      )}

      <table className="pacientes-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Component ID</th>
            <th>Lab ID</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {listToRender.length === 0 ? (
            <tr>
              <td colSpan="4" style={{ textAlign: "center", fontStyle: "italic" }}>
                {searchTerm
                  ? `No medicines found for "${searchTerm}"`
                  : "No medicines registered"}
              </td>
            </tr>
          ) : (
            listToRender.map((med) => (
              <tr key={med.id_medicine}>
                <td>{med.medicine_name}</td>
                <td>{med.component_name}</td>
                <td>{med.laboratory_name}</td>
                <td className="actions-cell">
                  <button className="btn btn-edit" onClick={() => onEditMedicine(med)}>
                    <img src={EditIcon} alt="Edit" width={20} height={20} />
                  </button>
                  <button className="btn btn-delete" onClick={() => {}}>
                    <img src={DeleteIcon} alt="Delete" width={20} height={20} />
                  </button>
                  <button className="btn btn-view" onClick={() => onViewMedicine(med)}>
                    <img src={ViewIcon} alt="View" width={20} height={20} />
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
