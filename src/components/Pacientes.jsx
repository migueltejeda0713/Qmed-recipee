// src/components/Pacientes.jsx
import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import "../styles/pacientes.css";
import "../styles/index.css";
import Draggable from "react-draggable";
import { API_URL } from "../utils/api";

// Función para obtener token
const getToken = () => localStorage.getItem("token") || "";

export default function Pacientes(props) {
  const location = useLocation();
  // Normalizar paciente: prioriza props.paciente, luego state, y finalmente un objeto vacío
  const pacienteProp = props.paciente ?? location.state?.paciente ?? {};
  const paciente = pacienteProp || {};
  const isEdit = Boolean(paciente.id);

  const dragRef = useRef(null);
  const [aseguradoras, setAseguradoras] = useState([]);
  const [form, setForm] = useState({
    nombre_paciente: "",
    apellido_paciente: "",
    cedula_paciente: "",
    telefono_paciente: "",
    edad_paciente: "",
    fecha_nacimiento: "",
    seguros: "",
    poliza_paciente: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [forceError, setForceError] = useState(false);

  const regex = {
    nombre: /^[a-zA-ZñÑáéíóúÁÉÍÓÚ\s]+$/,
    apellido: /^[a-zA-ZñÑáéíóúÁÉÍÓÚ\s]+$/,
    cedula_paciente: /^[0-9]{11}$/,
    telefono_paciente: /^[0-9]{10}$/,
  };

  // Calcula edad a partir de fecha
  const calculateAge = (birthDate) => {
    if (!birthDate) return "";
    const today = new Date(),
      b = new Date(birthDate);
    let age = today.getFullYear() - b.getFullYear();
    const m = today.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
    return String(age);
  };

  // Carga todas las aseguradoras para el select
  useEffect(() => {
    fetch(`${API_URL}/api/aseguradoras`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.json())
      .then(setAseguradoras)
      .catch(console.error);
  }, []);

  // Inicializa el formulario en modo edición o inserción
  useEffect(() => {
    if (isEdit) {
      const [first, ...rest] = (paciente.name || "").split(" ");
      const fecha = paciente.fecha_nacimiento || "";
      setForm({
        nombre_paciente: first,
        apellido_paciente: rest.join(" "),
        cedula_paciente: paciente.cedula || "",
        telefono_paciente: paciente.telefono || "",
        fecha_nacimiento: fecha,
        edad_paciente: calculateAge(fecha),
        seguros: paciente.id_aseguradora ? String(paciente.id_aseguradora) : "",
        poliza_paciente: "",
      });
    } else {
      setForm({
        nombre_paciente: "",
        apellido_paciente: "",
        cedula_paciente: "",
        telefono_paciente: "",
        edad_paciente: "",
        fecha_nacimiento: "",
        seguros: "",
        poliza_paciente: "",
      });
      setErrors({});
      setSubmitError("");
    }
  }, [isEdit, paciente]);

 
  useEffect(() => {
    if (isEdit) {
      fetch(`${API_URL}/api/edit_aseguradora/${paciente.id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
        .then((r) => {
          if (!r.ok) throw new Error("Error cargando póliza");
          return r.json();
        })
        .then(({ numero_poliza, id_aseguradora }) => {
          setForm((f) => ({
            ...f,
            poliza_paciente: numero_poliza || "",
            seguros: id_aseguradora ? String(id_aseguradora) : f.seguros,
          }));
        })
        .catch(console.error);
    }
  }, [isEdit, paciente.id]);

  // Maneja cambios de input y validaciones
  const handleInputChange = (e) => {
    const { name, value, checked } = e.target;
    if (name === "forceError") {
      setForceError(checked);
      return;
    }
    setForm((f) => {
      const u = { ...f, [name]: value };
      if (name === "fecha_nacimiento") {
        u.edad_paciente = calculateAge(value);
      }
      return u;
    });
    let err = "";
    if (name === "nombre_paciente" && !regex.nombre.test(value)) err = "Solo letras.";
    if (name === "apellido_paciente" && !regex.apellido.test(value))
      err = "Solo letras.";
    if (name === "cedula_paciente" && !regex.cedula_paciente.test(value))
      err = "11 dígitos.";
    if (name === "telefono_paciente" && value && !regex.telefono_paciente.test(value))
      err = "10 dígitos.";
    setErrors((all) => ({ ...all, [name]: err }));
  };

  const isFormValid = () =>
    Object.values(errors).every((e) => e === "") &&
    form.nombre_paciente &&
    form.apellido_paciente &&
    form.cedula_paciente &&
    form.edad_paciente;

  // Envío de datos (POST o PUT)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid()) return;
    setLoading(true);
    setSubmitError("");

    const token = getToken();
    let url = isEdit
      ? `${API_URL}/api/editpaciente/${paciente.id}`
      : `${API_URL}/api/paciente`;
    if (forceError) url += "?force_error=true";
    const method = isEdit ? "PUT" : "POST";

    const payload = {
      nombre_paciente: form.nombre_paciente,
      apellido_paciente: form.apellido_paciente,
      cedula_paciente: form.cedula_paciente,
      telefono_paciente: form.telefono_paciente,
      fecha_nacimiento: form.fecha_nacimiento
        ? new Date(form.fecha_nacimiento).toISOString().split("T")[0]
        : null,
      id_aseguradora: form.seguros ? parseInt(form.seguros, 10) : null,
      poliza_paciente: form.poliza_paciente,
    };

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      await res.json();
      props.onPacienteGuardado?.();
      props.onClose?.();
      props.setPaciente?.({});
    } catch (err) {
      console.error(err);
      setSubmitError(err.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`container-popup ${props.moduleAnimation ? "open" : "close"}`}>
      <Draggable nodeRef={dragRef} handle=".pacientes-titulo">
        <div className="draggable-wrapper" ref={dragRef}>
          <form onSubmit={handleSubmit} className="container-paciente">
            <h1 className="pacientes-titulo">
              {isEdit ? "Editar paciente" : "Agregar paciente"}
            </h1>

            {submitError && <div className="error-message">⚠️ {submitError}</div>}

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
                    <label htmlFor={field} className="paciente-label">
                      {label}:
                    </label>
                    <input
                      id={field}
                      name={field}
                      type={field === "fecha_nacimiento" ? "date" : "text"}
                      value={form[field]}
                      onChange={handleInputChange}
                      readOnly={field === "edad_paciente"}
                      className={`paciente-input ${
                        errors[field] ? "error-input" : ""
                      }`}
                      style={field === "edad_paciente" ? { opacity: 0.6 } : {}}
                    />
                    {errors[field] && (
                      <p className="error-message">{errors[field]}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="container-datos-seguro">
                <label htmlFor="seguros" className="paciente-label">
                  Seguro:
                </label>
                <select
                  id="seguros"
                  name="seguros"
                  value={form.seguros}
                  onChange={handleInputChange}
                  className="seguros-container"
                >
                  <option value="">Seleccione un seguro</option>
                  {aseguradoras.map((a) => (
                    <option key={a.id_seguro} value={a.id_seguro}>
                      {a.nombre_aseguradora}
                    </option>
                  ))}
                </select>

                <label htmlFor="poliza_paciente" className="paciente-label">
                  Póliza:
                </label>
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

            <div className="footer-buttons">
              <button
                type="submit"
                className={`btn-enviar ${!isFormValid() ? "disabled" : ""}`}
                disabled={!isFormValid() || isLoading}
              >
                {isLoading
                  ? "Cargando..."
                  : isEdit
                  ? "Guardar cambios"
                  : "Agregar"}
              </button>
              <button
                type="button"
                className="close-popup-btn"
                onClick={() => props.onClose?.()}
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
