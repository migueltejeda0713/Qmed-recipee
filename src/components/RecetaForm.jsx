// src/components/RecetaForm.jsx
import React, { useState, useMemo, useRef } from "react";
import axios from "axios";
import "../styles/RecetaForm.css";
import { API_URL } from "../utils/api";
import EditIcon from "../svg/edit-3-svgrepo-com.svg";
import DeleteIcon from "../svg/delete-svgrepo-com.svg";


export default function RecetaForm() {
  const [patient, setPatient] = useState({
    id: "",
    nombre: "",
    fechaNacimiento: "",
    documento: "",
  });
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef(null);

  const handleInputFocus = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/searchpacient?limit=5`, { withCredentials: true });
      setSearchResults(data?.data ?? []);
      setShowDropdown(true);
    } catch (err) {
      console.error("Error cargando pacientes recientes:", err);
    }
  };

  const handlePatientNameChange = (e) => {
    const value = e.target.value;
    setPatient({ id: "", nombre: value, fechaNacimiento: "", documento: "" });
    clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setShowDropdown(false);
      setSearchResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await axios.get(
          `${API_URL}/api/searchpacient?name=${encodeURIComponent(value)}`,
          { withCredentials: true }
        );
        setSearchResults(data?.data ?? []);
        setShowDropdown(true);
      } catch (err) {
        console.error("Error buscando pacientes:", err);
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 700);
  };

  const handleSelectPaciente = (p) => {
    setPatient({
      id: p.id || "",
      nombre: p.name || "",
      fechaNacimiento: p.birthDate || "",
      documento: p.document_id || "",
    });
    setShowDropdown(false);
    setSearchResults([]);
  };

  const calculateAge = useMemo(() => {
    if (!patient.fechaNacimiento) return "";
    const today = new Date();
    const birth = new Date(patient.fechaNacimiento);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }, [patient.fechaNacimiento]);

  const defaultPresc = () => ({
    id: Date.now(),
    nombre: "",
    cantidad: "",
    dosis: "",
    modoUso: "",
    saved: false,
  });

  const [prescriptions, setPrescriptions] = useState([defaultPresc()]);

  const handleAddPrescription = () => {
    setPrescriptions((prev) => [...prev, defaultPresc()]);
  };

  const handlePrescriptionChange = (id, e) => {
    const { name, value } = e.target;
    setPrescriptions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [name]: value } : p))
    );
  };

  const handleSavePrescription = (id) => {
    setPrescriptions((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        if (!p.nombre.trim() || !p.cantidad.trim() || !p.dosis.trim()) {
          alert("Complete nombre, cantidad y dosis antes de guardar.");
          return p;
        }
        return { ...p, saved: true };
      })
    );
  };

  const handleRemovePrescription = (id) => {
    setPrescriptions((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      return updated.length ? updated : [defaultPresc()];
    });
  };

  const handleEditPrescription = (id) => {
    setPrescriptions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, saved: false } : p))
    );
  };

  const canAddAnother =
    prescriptions.length > 0 && prescriptions[prescriptions.length - 1].saved;

  const handleSubmit = (e) => {
    e.preventDefault();
    const enviados = prescriptions.filter((p) => p.saved);
    if (!enviados.length) {
      alert("Agregue al menos una prescripción guardada.");
      return;
    }

    // Aquí podrías enviar la receta al backend, por ejemplo:
    // const token = getToken();
    // axios.post(`${API_URL}/api/recetas`, { pacienteId: patient.id, prescriptions: enviados }, {
    //   headers: { Authorization: `Bearer ${token}` }
    // });

    console.log({
      pacienteId: patient.id,
      patient,
      edad: calculateAge,
      prescriptions: enviados,
    });
  };

  return (
    <form className="receta-form" onSubmit={handleSubmit}>
      <div className="receta-column">
        <h3>Datos del Paciente</h3>
        <label className="input-select-label">
          Nombre:
          <div className="input-select-wrapper">
            <input
              type="text"
              name="nombre"
              placeholder="Buscar paciente..."
              value={patient.nombre}
              onChange={handlePatientNameChange}
              onFocus={handleInputFocus}
              autoComplete="off"
              required
            />
            {showDropdown && (
              <ul className="dropdown-list">
                {searchResults.map((p) => (
                  <li
                    key={p.id}
                    className="dropdown-item"
                    onMouseDown={() => handleSelectPaciente(p)}
                  >
                    {p.name} — {p.document_id}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </label>
        <label>
          Fecha de nacimiento:
          <input type="date" value={patient.fechaNacimiento} readOnly />
        </label>
        <label>
          Edad:
          <input
            type="text"
            value={calculateAge ? `${calculateAge} años` : ""}
            readOnly
          />
        </label>
        <label>
          Documento:
          <input type="text" value={patient.documento} readOnly />
        </label>
      </div>

      <div className="receta-column">
        <h3>Prescripciones</h3>
        <div className="prescriptions-list">
          {prescriptions.map((presc) => (
            <div className="prescription-item" key={presc.id}>
              {!presc.saved ? (
                <>
                  {prescriptions.length > 1 && (
                    <button
                      type="button"
                      className="remove-prescription-btn"
                      onClick={() => handleRemovePrescription(presc.id)}
                    >
                      ×
                    </button>
                  )}
                  <label>
                    Nombre:
                    <input
                      type="text"
                      name="nombre"
                      value={presc.nombre}
                      onChange={(e) => handlePrescriptionChange(presc.id, e)}
                      required
                    />
                  </label>
                  <label>
                    Cantidad:
                    <input
                      type="text"
                      name="cantidad"
                      value={presc.cantidad}
                      onChange={(e) => handlePrescriptionChange(presc.id, e)}
                      required
                    />
                  </label>
                  <label>
                    Dosis:
                    <textarea
                      name="dosis"
                      value={presc.dosis}
                      onChange={(e) => handlePrescriptionChange(presc.id, e)}
                      required
                    />
                  </label>
                  <label>
                    Modo de uso:
                    <textarea
                      name="modoUso"
                      value={presc.modoUso}
                      onChange={(e) => handlePrescriptionChange(presc.id, e)}
                    />
                  </label>
                  <button
                    type="button"
                    className="save-medicamento-btn"
                    onClick={() => handleSavePrescription(presc.id)}
                  >
                    Guardar
                  </button>
                </>
              ) : (
                <div className="prescription-preview">
                  <div className="preview-text">
                    <strong>{presc.nombre}</strong> — {presc.cantidad}
                    <br />
                    <em>Dosis:</em> {presc.dosis}
                    {presc.modoUso && (
                      <>
                        <br />
                        <em>Modo de uso:</em> {presc.modoUso}
                      </>
                    )}
                  </div>
                  <div className="preview-actions">
                    <button
                      type="button"
                      className="btn btn-edit"
                      onClick={() => handleEditPrescription(presc.id)}
                    >
                      <img src={EditIcon} alt="Editar" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-delete"
                      onClick={() => handleRemovePrescription(presc.id)}
                    >
                      <img src={DeleteIcon} alt="Eliminar" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        {canAddAnother && (
          <button
            type="button"
            className="add-prescripcion-btn"
            onClick={handleAddPrescription}
          >
            Agregar Prescripción
          </button>
        )}
      </div>

      <div className="receta-actions">
        <button type="submit">Guardar Receta</button>
      </div>
    </form>
  );
}
