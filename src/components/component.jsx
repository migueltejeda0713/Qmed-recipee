// src/components/ComponentModal.jsx
import React, { useRef, useState } from "react";
import Draggable from "react-draggable";
import "../styles/pacientes.css";
import "../styles/index.css";
import { API_URL } from "../utils/api";

const getToken = () => localStorage.getItem("token") || "";

export default function ComponentModal({ onClose, moduleAnimation }) {
  const dragRef = useRef(null);
  const [form, setForm] = useState({ nombre: "" });
  const [errors, setErrors] = useState({ nombre: "" });
  const [isLoading, setLoading] = useState(false);

  const isValid = () => form.nombre.trim().length > 0 && !errors.nombre;

  const handleChange = (e) => {
    const value = e.target.value;
    setForm({ nombre: value });
    setErrors({
      nombre: value.trim() === "" ? "El nombre es requerido" : "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid()) return;
    setLoading(true);
    const token = getToken();

    try {
      const res = await fetch(`${API_URL}/api/componentes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nombre: form.nombre.trim() }),
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
    <div className={`container-popup ${moduleAnimation ? "open" : "close"}`}>
      <Draggable nodeRef={dragRef} handle=".lab-titulo">
        <div className="draggable-wrapper" ref={dragRef}>
          <form onSubmit={handleSubmit} className="container-paciente">
            <h1 className="lab-titulo">Agregar Componente</h1>

            <label htmlFor="nombre" className="paciente-label">
              Nombre del componente:
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              maxLength={50}
              value={form.nombre}
              placeholder="Escribe el nombre..."
              className={
                errors.nombre ? "paciente-input error-input" : "paciente-input"
              }
              onChange={handleChange}
            />
            {errors.nombre && (
              <p className="error-message">{errors.nombre}</p>
            )}

            <div className="footer-buttons">
              <button
                type="submit"
                className="btn-enviar"
                disabled={!isValid() || isLoading}
              >
                {isLoading ? "Guardando..." : "Guardar"}
              </button>
              <button
                type="button"
                className="close-popup-btn"
                onClick={onClose}
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
