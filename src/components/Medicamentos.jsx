// src/components/Medicamentos.jsx
import React, { useEffect, useRef, useState } from "react";
import "../styles/medicamentos.css";
import "../styles/index.css";
import Draggable from "react-draggable";
import { API_URL } from "../utils/api";

const getToken = () => localStorage.getItem("token") || "";

export default function Medicamentos({
  medicamento = {},
  setShowModule,
  moduleAnimation,
  onMedicamentoGuardado,
}) {
  const dragRef = useRef(null);

  const [componentes, setComponentes] = useState([]);
  const [laboratorios, setLaboratorios] = useState([]);
  const [form, setForm] = useState({
    nombre_medicamento: "",
    id_componente: "",
    id_laboratorio: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    const token = getToken();

    fetch(`${API_URL}/api/getcomponentes`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => res.ok ? res.json() : Promise.resolve([]))
      .then(json => setComponentes(json))
      .catch(() => setComponentes([]));

    fetch(`${API_URL}/api/getlaboratorios`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => res.ok ? res.json() : Promise.resolve([]))
      .then(json => setLaboratorios(json))
      .catch(() => setLaboratorios([]));
  }, []);

  useEffect(() => {
    if (medicamento?.id_medicine) {
      setForm({
        nombre_medicamento: medicamento.medicine_name || "",
        id_componente: String(medicamento.id_component || ""),
        id_laboratorio: String(medicamento.id_laboratory || ""),
      });
    } else {
      setForm({
        nombre_medicamento: "",
        id_componente: "",
        id_laboratorio: "",
      });
    }
    setErrors({});
    setSubmitError("");
  }, [medicamento?.id_medicine]); 

  const handleInputChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));

    let error = "";
    if (name === "nombre_medicamento" && value.trim().length < 3) {
      error = "Min. 3 caracteres.";
    }
    if ((name === "id_componente" || name === "id_laboratorio") && !value) {
      error = "Requerido.";
    }
    setErrors(errs => ({ ...errs, [name]: error }));
  };

  const isFormValid = () =>
    form.nombre_medicamento.trim().length >= 3 &&
    form.id_componente &&
    form.id_laboratorio &&
    Object.values(errors).every(e => e === "");

  const handleSubmit = async e => {
    e.preventDefault();
    if (!isFormValid()) return;

    const token = getToken();
    setLoading(true);
    setSubmitError("");

    const payload = {
      medicine_name: form.nombre_medicamento.trim(),
      id_component: form.id_componente,
      id_laboratory: form.id_laboratorio,
    };

    try {
      const res = await fetch(`${API_URL}/api/medicamento`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Error al guardar");
      }

      await res.json();
      onMedicamentoGuardado && onMedicamentoGuardado();
      setShowModule(false);
    } catch (err) {
      console.error(err);
      setSubmitError(err.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`container-popup ${moduleAnimation ? "open" : "close"}`}>
      <Draggable nodeRef={dragRef} handle=".medicamentos-titulo">
        <div className="draggable-wrapper" ref={dragRef}>
          <form onSubmit={handleSubmit} className="container-medicamento">
            <h1 className="medicamentos-titulo">
              {medicamento.id_medicine ? "Editar medicamento" : "Nuevo medicamento"}
            </h1>

            {submitError && (
              <div className="error-message" style={{ marginBottom: "1rem" }}>
                ⚠️ {submitError}
              </div>
            )}

            <div className="container-datos">
              <div className="campo">
                <label htmlFor="nombre_medicamento">Nombre:</label>
                <input
                  id="nombre_medicamento"
                  name="nombre_medicamento"
                  type="text"
                  value={form.nombre_medicamento}
                  placeholder="Ingrese nombre"
                  className={errors.nombre_medicamento ? "error-input" : ""}
                  onChange={handleInputChange}
                />
                {errors.nombre_medicamento && <p className="error-message">{errors.nombre_medicamento}</p>}
              </div>

              <div className="campo">
                <label htmlFor="id_componente">Componente:</label>
                <select
                  id="id_componente"
                  name="id_componente"
                  value={form.id_componente}
                  onChange={handleInputChange}
                  className={errors.id_componente ? "error-input" : ""}
                >
                  <option value="">-- Seleccione --</option>
                  {componentes.map(c => (
                    <option key={c.id_component} value={c.id_component}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {errors.id_componente && <p className="error-message">{errors.id_componente}</p>}
              </div>

              <div className="campo">
                <label htmlFor="id_laboratorio">Laboratorio:</label>
                <select
                  id="id_laboratorio"
                  name="id_laboratorio"
                  value={form.id_laboratorio}
                  onChange={handleInputChange}
                  className={errors.id_laboratorio ? "error-input" : ""}
                >
                  <option value="">-- Seleccione --</option>
                  {laboratorios.map(l => (
                    <option key={l.id_laboratory} value={l.id_laboratory}>
                      {l.laboratory_name}
                    </option>
                  ))}
                </select>
                {errors.id_laboratorio && <p className="error-message">{errors.id_laboratorio}</p>}
              </div>
            </div>

            <div className="footer-buttons">
              <button
                type="submit"
                className={`btn-enviar ${!isFormValid() ? "disabled" : ""}`}
                disabled={!isFormValid() || isLoading}
              >
                {isLoading ? "Guardando..." : medicamento.id_medicine ? "Guardar cambios" : "Agregar"}
              </button>
              <button type="button" className="close-popup-btn" onClick={() => setShowModule(false)}>
                X
              </button>
            </div>
          </form>
        </div>
      </Draggable>
    </div>
  );
}
