// src/components/component.jsx
import React, { useState } from "react";
import "../styles/pacientes.css";
import "../styles/index.css";
import { API_URL } from "../utils/api";
import DraggableFormModal from "./DraggableFormModal";


export default function ComponentModal({ onClose, moduleAnimation }) {
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setLoading] = useState(false);

  const isValid = nombre.trim().length > 0 && !error;

  const handleChange = (e) => {
    const value = e.target.value;
    setNombre(value);
    setError(value.trim() === "" ? "El nombre es requerido" : "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/componentes`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nombre.trim() }),
      });
      if (!res.ok) throw new Error("Error al agregar componente");
      await res.json();
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DraggableFormModal
      moduleAnimation={moduleAnimation}
      titleClass="lab-titulo"
      formClass="container-paciente"
      title="Agregar Componente"
      error=""
      isValid={isValid}
      isLoading={isLoading}
      submitLabel="Guardar"
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <label htmlFor="nombre" className="paciente-label">
        Nombre del componente:
      </label>
      <input
        id="nombre"
        name="nombre"
        type="text"
        maxLength={50}
        value={nombre}
        placeholder="Escribe el nombre..."
        className={error ? "paciente-input error-input" : "paciente-input"}
        onChange={handleChange}
      />
      {error && <p className="error-message">{error}</p>}
    </DraggableFormModal>
  );
}
