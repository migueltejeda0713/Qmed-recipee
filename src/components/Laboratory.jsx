// src/components/Laboratory.jsx
import React, { useState } from "react";
import "../styles/pacientes.css";
import "../styles/index.css";
import { API_URL, apiFetch } from "../utils/api";
import DraggableFormModal from "./DraggableFormModal";

export default function Laboratorios({ showModule, setShowModule, onLaboratorioGuardado, moduleAnimation }) {
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setLoading] = useState(false);

  const isValid = nombre.trim() !== "";

  const handleChange = (e) => {
    const value = e.target.value;
    setNombre(value);
    if (error && value.trim()) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) { setError("El nombre es obligatorio"); return; }
    setLoading(true);
    try {
      const res = await apiFetch(`${API_URL}/api/laboratorios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ laboratory_name: nombre.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      await res.json();
      onLaboratorioGuardado();
      setNombre("");
      setError("");
      setShowModule(false);
    } catch {
      setError("No se pudo crear el laboratorio");
    } finally {
      setLoading(false);
    }
  };

  if (!showModule) return null;

  return (
    <DraggableFormModal
      moduleAnimation={moduleAnimation}
      titleClass="lab-titulo"
      formClass="container-paciente"
      title="Agregar Laboratorio"
      error={error}
      isValid={isValid}
      isLoading={isLoading}
      submitLabel="Guardar"
      onSubmit={handleSubmit}
      onClose={() => setShowModule(false)}
    >
      <div className="container-datos-pacientes">
        <label htmlFor="nombre_laboratorio" className="paciente-label">
          Nombre del laboratorio:
        </label>
        <input
          id="nombre_laboratorio"
          name="nombre_laboratorio"
          type="text"
          maxLength={55}
          value={nombre}
          placeholder="Escribe el nombre..."
          className={error ? "paciente-input error-input" : "paciente-input"}
          onChange={handleChange}
        />
      </div>
    </DraggableFormModal>
  );
}
