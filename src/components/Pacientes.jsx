// src/components/Pacientes.jsx
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import "../styles/pacientes.css";
import "../styles/index.css";
import { API_URL } from "../utils/api";
import DraggableFormModal from "./DraggableFormModal";


const regex = {
  nombre: /^[a-zA-ZñÑáéíóúÁÉÍÓÚ\s]+$/,
  apellido: /^[a-zA-ZñÑáéíóúÁÉÍÓÚ\s]+$/,
  cedula_paciente: /^[0-9]{11}$/,
  telefono_paciente: /^[0-9]{10}$/,
};

const calculateAge = (birthDate) => {
  if (!birthDate) return "";
  const today = new Date(), b = new Date(birthDate);
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return String(age);
};

const emptyForm = {
  nombre_paciente: "",
  apellido_paciente: "",
  cedula_paciente: "",
  telefono_paciente: "",
  edad_paciente: "",
  fecha_nacimiento: "",
  seguros: "",
  poliza_paciente: "",
};

export default function Pacientes(props) {
  const location = useLocation();
  const paciente = props.paciente ?? location.state?.paciente ?? {};
  const pacienteId = paciente.id;
  const isEdit = Boolean(pacienteId);

  const [aseguradoras, setAseguradoras] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [isLoading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [forceError, setForceError] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/aseguradoras`, { credentials: "include" })
      .then((r) => r.json())
      .then((res) => {
        const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        setAseguradoras(list);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (isEdit) {
      const [first, ...rest] = (paciente.name || "").split(" ");
      const fecha = paciente.birth_date || "";
      setForm({
        ...emptyForm,
        nombre_paciente: first,
        apellido_paciente: rest.join(" "),
        cedula_paciente: paciente.document_id || "",
        telefono_paciente: paciente.phone || "",
        fecha_nacimiento: fecha,
        edad_paciente: calculateAge(fecha),
      });
    } else {
      setForm(emptyForm);
      setErrors({});
      setSubmitError("");
    }
  }, [isEdit, pacienteId]);

  useEffect(() => {
    if (!isEdit) return;
    fetch(`${API_URL}/api/edit_aseguradora/${paciente.id}`, { credentials: "include" })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(({ policy_number, id_provider }) => {
        setForm((f) => ({
          ...f,
          poliza_paciente: policy_number || "",
          seguros: id_provider ? String(id_provider) : f.seguros,
        }));
      })
      .catch(console.error);
  }, [isEdit, pacienteId]);

  const handleInputChange = (e) => {
    const { name, value, checked } = e.target;
    if (name === "forceError") { setForceError(checked); return; }
    setForm((f) => {
      const u = { ...f, [name]: value };
      if (name === "fecha_nacimiento") u.edad_paciente = calculateAge(value);
      return u;
    });
    let err = "";
    if (name === "nombre_paciente" && !regex.nombre.test(value)) err = "Solo letras.";
    if (name === "apellido_paciente" && !regex.apellido.test(value)) err = "Solo letras.";
    if (name === "cedula_paciente" && !regex.cedula_paciente.test(value)) err = "11 dígitos.";
    if (name === "telefono_paciente" && value && !regex.telefono_paciente.test(value)) err = "10 dígitos.";
    setErrors((all) => ({ ...all, [name]: err }));
  };

  const isFormValid = () =>
    Object.values(errors).every((e) => e === "") &&
    form.nombre_paciente &&
    form.apellido_paciente &&
    form.cedula_paciente &&
    form.edad_paciente;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid()) return;
    setLoading(true);
    setSubmitError("");

    let url = isEdit ? `${API_URL}/api/editpaciente/${paciente.id}` : `${API_URL}/api/paciente`;
    if (forceError) url += "?force_error=true";

    const payload = {
      first_name: form.nombre_paciente,
      last_name: form.apellido_paciente,
      document_id: form.cedula_paciente,
      phone: form.telefono_paciente,
      birth_date: form.fecha_nacimiento
        ? new Date(form.fecha_nacimiento).toISOString().split("T")[0]
        : null,
      id_provider: form.seguros || "",
      policy_number: form.poliza_paciente,
    };

    try {
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      await res.json();
      props.onPacienteGuardado?.();
      props.onClose?.();
      props.setPaciente?.({});
    } catch (err) {
      setSubmitError(err.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DraggableFormModal
      moduleAnimation={props.moduleAnimation}
      titleClass="pacientes-titulo"
      formClass="container-paciente"
      title={isEdit ? "Editar paciente" : "Agregar paciente"}
      error={submitError}
      isValid={isFormValid()}
      isLoading={isLoading}
      submitLabel={isEdit ? "Guardar cambios" : "Agregar"}
      onSubmit={handleSubmit}
      onClose={() => props.onClose?.()}
    >
      <div className="container-datos">
        <div className="container-datos-pacientes">
          {[
            ["nombre_paciente", "Nombre"],
            ["apellido_paciente", "Apellido"],
            ["cedula_paciente", "Cédula"],
            ["telefono_paciente", "Teléfono"],
            ["fecha_nacimiento", "Fecha de nacimiento"],
            ["edad_paciente", "Edad"],
          ].map(([field, label]) => (
            <div key={field}>
              <label htmlFor={field} className="paciente-label">{label}:</label>
              <input
                id={field}
                name={field}
                type={field === "fecha_nacimiento" ? "date" : "text"}
                value={form[field]}
                onChange={handleInputChange}
                readOnly={field === "edad_paciente"}
                className={`paciente-input ${errors[field] ? "error-input" : ""}`}
                style={field === "edad_paciente" ? { opacity: 0.6 } : {}}
              />
              {errors[field] && <p className="error-message">{errors[field]}</p>}
            </div>
          ))}
        </div>

        <div className="container-datos-seguro">
          <label htmlFor="seguros" className="paciente-label">Seguro:</label>
          <select
            id="seguros"
            name="seguros"
            value={form.seguros}
            onChange={handleInputChange}
            className="seguros-container"
          >
            <option value="">Seleccione un seguro</option>
            {aseguradoras.map((a) => (
              <option key={a.id_provider} value={a.id_provider}>
                {a.provider_name}
              </option>
            ))}
          </select>

          <label htmlFor="poliza_paciente" className="paciente-label">Póliza:</label>
          <input
            id="poliza_paciente"
            name="poliza_paciente"
            type="text"
            value={form.poliza_paciente}
            onChange={handleInputChange}
            className="paciente-input"
          />
        </div>
      </div>
    </DraggableFormModal>
  );
}
