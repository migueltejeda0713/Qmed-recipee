import { useState } from "react";
import "../styles/prescripcion.css";

export default function Prescripcion({ setPrescripciones }) {
  const [medicamento, setMedicamento] = useState("");
  const [modoUso, setModoUso] = useState("");
  const [prescripcion, setPrescripcion] = useState([]);
  const [editIndex, setEditIndex] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!medicamento || !modoUso) {
      alert("Por favor, complete todos los campos.");
      return;
    }

    if (editIndex !== null) {
      // Editar una prescripción existente
      const updatedPrescripcion = [...prescripcion];
      updatedPrescripcion[editIndex] = { medicamento, modoUso };
      setPrescripcion(updatedPrescripcion);
      setPrescripciones(updatedPrescripcion);
      setEditIndex(null);
    } else {
      // Agregar una nueva prescripción
      const nuevaPrescripcion = { medicamento, modoUso };
      setPrescripcion((prev) => [...prev, nuevaPrescripcion]);
      setPrescripciones((prev) => [...prev, nuevaPrescripcion]);
    }

    setMedicamento("");
    setModoUso("");
  };

  const handleDelete = (index) => {
    const updatedPrescripcion = prescripcion.filter((_, i) => i !== index);
    setPrescripcion(updatedPrescripcion);
    setPrescripciones(updatedPrescripcion);
    if (editIndex === index) {
      setEditIndex(null);
    }
  };

  const handleEditField = (index, field, value) => {
    const updatedPrescripcion = [...prescripcion];
    updatedPrescripcion[index][field] = value;
    setPrescripcion(updatedPrescripcion);
    setPrescripciones(updatedPrescripcion);
  };

  const toggleEditMode = (index) => {
    if (editIndex === index) {
      setEditIndex(null);
    } else {
      setEditIndex(index);
    }
  };

  return (
    <div className="container-prescripcion">
      <h1>Prescripción</h1>
      <form onSubmit={handleSubmit} className="form-prescripcion">
        <label htmlFor="medicamento">Medicamento:</label>
        <input
          type="text"
          id="medicamento"
          placeholder="Ingrese el medicamento..."
          value={medicamento}
          onChange={(e) => setMedicamento(e.target.value)}
        />

        <label htmlFor="modoUso">Modo de uso:</label>
        <input
          type="text"
          id="modoUso"
          placeholder="Ingrese el modo de uso..."
          value={modoUso}
          onChange={(e) => setModoUso(e.target.value)}
        />

        <button type="submit" className="btn-prescripcion">
          {editIndex !== null ? "Guardar" : "Agregar"}
        </button>
      </form>

      <div className="todo-container">
        {prescripcion.map((item, index) => (
          <div className="todo-item" key={index}>
            <div className="todo-item-info">
              <h3
                contentEditable={editIndex === index}
                suppressContentEditableWarning={true}
                onBlur={(e) =>
                  handleEditField(
                    index,
                    "medicamento",
                    e.currentTarget.textContent
                  )
                }
                className={editIndex === index ? "editable" : ""}
              >
                {item.medicamento}
              </h3>
              <p
                contentEditable={editIndex === index}
                suppressContentEditableWarning={true}
                onBlur={(e) =>
                  handleEditField(index, "modoUso", e.currentTarget.textContent)
                }
                className={editIndex === index ? "editable" : ""}
              >
                {item.modoUso}
              </p>
            </div>
            <div className="todo-item-actions">
              <button
                onClick={() => toggleEditMode(index)}
                className="cambiar-btn"
              >
                {editIndex === index ? "Guardar" : "Editar"}
              </button>
              <button
                onClick={() => handleDelete(index)}
                className="delete-btn"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
