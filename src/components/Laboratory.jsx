// src/components/Laboratory.jsx
import React, { useRef, useState } from "react";
import Draggable from "react-draggable";
import "../styles/pacientes.css";
import "../styles/index.css";
import { API_URL } from "../utils/api";

export default function Laboratorios({
  showModule,
  setShowModule,
  onLaboratorioGuardado,
  moduleAnimation,
}) {
  const dragRef = useRef(null);
  const [form, setForm] = useState({ nombre_laboratorio: "" });
  const [error, setError] = useState("");
  const [isLoading, setLoading] = useState(false);

  const isValid = form.nombre_laboratorio.trim() !== "";
  const validate = () => {
    if (!isValid) {
      setError("El nombre es obligatorio");
      return false;
    }
    setError("");
    return true;
  };

  const handleChange = (e) => {
    setForm({ nombre_laboratorio: e.target.value });
    if (error) validate();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${API_URL}/api/laboratorios`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ laboratory_name: form.nombre_laboratorio.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      await res.json();
      onLaboratorioGuardado();
      setForm({ nombre_laboratorio: "" });
      setError("");
      setShowModule(false);
    } catch (err) {
      console.error("Error creando laboratorio:", err);
      setError("No se pudo crear el laboratorio");
    } finally {
      setLoading(false);
    }
  };

  if (!showModule) return null;

  return (
    <div className={`container-popup ${moduleAnimation ? "open" : "close"}`}>
      <Draggable nodeRef={dragRef} handle=".lab-titulo">
        <div className="draggable-wrapper" ref={dragRef}>
          <form onSubmit={handleSubmit} className="container-paciente">
            <h1 className="lab-titulo">Agregar Laboratorio</h1>

            {error && (
              <div className="error-message" style={{ marginBottom: "1rem" }}>
                ⚠️ {error}
              </div>
            )}

            <div className="container-datos-pacientes">
              <label htmlFor="nombre_laboratorio" className="paciente-label">
                Nombre del laboratorio:
              </label>
              <input
                id="nombre_laboratorio"
                name="nombre_laboratorio"
                type="text"
                maxLength={55}
                value={form.nombre_laboratorio}
                placeholder="Escribe el nombre..."
                className={error ? "paciente-input error-input" : "paciente-input"}
                onChange={handleChange}
              />
            </div>

            <div className="footer-buttons">
              <button
                type="submit"
                className={`btn-enviar ${!isValid ? "disabled" : ""}`}
                disabled={!isValid || isLoading}
              >
                {isLoading ? "Guardando..." : "Guardar"}
              </button>
              <button
                type="button"
                className="close-popup-btn"
                onClick={() => setShowModule(false)}
              >
                X
              </button>
            </div>
          </form>
        </div>
      </Draggable>
    </div>
  );
}
