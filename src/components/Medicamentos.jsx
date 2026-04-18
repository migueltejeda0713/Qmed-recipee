// src/components/Medicamentos.jsx
import React, { useEffect, useState } from "react";
import "../styles/medicamentos.css";
import "../styles/index.css";
import { API_URL } from "../utils/api";
import DraggableFormModal from "./DraggableFormModal";

const getToken = () => localStorage.getItem("token") || "";

export default function Medicamentos({
  medicamento = {},
  setShowModule,
  moduleAnimation,
  onMedicamentoGuardado,
}) {
  const isEdit = Boolean(medicamento?.id_medicine);

  const [componentes, setComponentes] = useState([]);
  const [laboratorios, setLaboratorios] = useState([]);
  const [form, setForm] = useState({ nombre_medicamento: "", id_componente: "", id_laboratorio: "" });
  const [errors, setErrors] = useState({});
  const [isLoading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    const token = getToken();
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

    fetch(`${API_URL}/api/getcomponentes`, { headers })
      .then((r) => (r.ok ? r.json() : []))
      .then(setComponentes)
      .catch(() => setComponentes([]));

    fetch(`${API_URL}/api/getlaboratorios`, { headers })
      .then((r) => (r.ok ? r.json() : []))
      .then(setLaboratorios)
      .catch(() => setLaboratorios([]));
  }, []);

  useEffect(() => {
    if (isEdit) {
      setForm({
        nombre_medicamento: medicamento.medicine_name || "",
        id_componente: String(medicamento.id_component || ""),
        id_laboratorio: String(medicamento.id_laboratory || ""),
      });
    } else {
      setForm({ nombre_medicamento: "", id_componente: "", id_laboratorio: "" });
    }
    setErrors({});
    setSubmitError("");
  }, [medicamento?.id_medicine]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    let error = "";
    if (name === "nombre_medicamento" && value.trim().length < 3) error = "Min. 3 caracteres.";
    if ((name === "id_componente" || name === "id_laboratorio") && !value) error = "Requerido.";
    setErrors((errs) => ({ ...errs, [name]: error }));
  };

  const isFormValid = () =>
    form.nombre_medicamento.trim().length >= 3 &&
    form.id_componente &&
    form.id_laboratorio &&
    Object.values(errors).every((e) => e === "");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid()) return;
    setLoading(true);
    setSubmitError("");

    try {
      const res = await fetch(`${API_URL}/api/medicamento`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          medicine_name: form.nombre_medicamento.trim(),
          id_component: form.id_componente,
          id_laboratory: form.id_laboratorio,
        }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Error al guardar");
      await res.json();
      onMedicamentoGuardado?.();
      setShowModule(false);
    } catch (err) {
      setSubmitError(err.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DraggableFormModal
      moduleAnimation={moduleAnimation}
      titleClass="medicamentos-titulo"
      formClass="container-medicamento"
      title={isEdit ? "Editar medicamento" : "Nuevo medicamento"}
      error={submitError}
      isValid={isFormValid()}
      isLoading={isLoading}
      submitLabel={isEdit ? "Guardar cambios" : "Agregar"}
      onSubmit={handleSubmit}
      onClose={() => setShowModule(false)}
    >
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
            {componentes.map((c) => (
              <option key={c.id_component} value={c.id_component}>{c.name}</option>
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
            {laboratorios.map((l) => (
              <option key={l.id_laboratory} value={l.id_laboratory}>{l.laboratory_name}</option>
            ))}
          </select>
          {errors.id_laboratorio && <p className="error-message">{errors.id_laboratorio}</p>}
        </div>
      </div>
    </DraggableFormModal>
  );
}
