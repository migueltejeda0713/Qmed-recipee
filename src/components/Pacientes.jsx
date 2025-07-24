import React, { useEffect, useRef, useState } from "react";
import "../styles/pacientes.css";
import "../styles/index.css";
import Draggable from "react-draggable";
import { API_URL } from "../utils/api";

// Función para obtener token
const getToken = () => localStorage.getItem("token") || "";

export default function Pacientes({
  paciente = {},
  setPaciente,
  setShowModule,
  moduleAnimation,
  onPacienteGuardado,
}) {
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

  const calculateAge = (birthDate) => {
    if (!birthDate) return "";
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age.toString();
  };

  useEffect(() => {
    const token = getToken();
    fetch(`${API_URL}/api/aseguradoras`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setAseguradoras)
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (paciente && paciente.id) {
      const [nombre, ...rest] = (paciente.name || "").split(" ");
      const fechaNacimiento = paciente.fecha_nacimiento || "";
      setForm((f) => ({
        ...f,
        nombre_paciente: nombre,
        apellido_paciente: rest.join(" "),
        cedula_paciente: paciente.cedula || "",
        telefono_paciente: paciente.telefono || "",
        fecha_nacimiento: fechaNacimiento,
        edad_paciente: calculateAge(fechaNacimiento),
      }));
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
    }
  }, [paciente]);

  useEffect(() => {
    if (paciente && paciente.id && aseguradoras.length > 0) {
      const token = getToken();
      setForm((f) => ({
        ...f,
        seguros: String(paciente.id_aseguradora || ""),
      }));
      fetch(`${API_URL}/api/edit_aseguradora/${paciente.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => {
          if (!r.ok) throw new Error("Error cargando póliza");
          return r.json();
        })
        .then(({ numero_poliza, id_aseguradora }) =>
          setForm((f) => ({
            ...f,
            seguros: String(id_aseguradora || ""),
            poliza_paciente: numero_poliza || "",
          }))
        )
        .catch(console.error);
    }
  }, [paciente, aseguradoras]);

  const handleInputChange = (e) => {
    const { name, value, checked } = e.target;
    if (name === "forceError") {
      setForceError(checked);
      return;
    }

    setForm((f) => {
      const newForm = { ...f, [name]: value };
      if (name === "fecha_nacimiento") {
        newForm.edad_paciente = calculateAge(value);
      }
      return newForm;
    });

    let error = "";
    if (name === "nombre_paciente" && !regex.nombre.test(value)) error = "Solo letras.";
    if (name === "apellido_paciente" && !regex.apellido.test(value)) error = "Solo letras.";
    if (name === "cedula_paciente" && !regex.cedula_paciente.test(value)) error = "11 dígitos.";
    if (name === "telefono_paciente" && value && !regex.telefono_paciente.test(value))
      error = "10 dígitos.";

    setErrors((errs) => ({ ...errs, [name]: error }));
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

    const token = getToken();
    const isEdit = Boolean(paciente && paciente.id);
    let url = isEdit
      ? `${API_URL}/api/editpaciente/${paciente.id}`
      : `${API_URL}/api/paciente`;

    if (forceError) url += "?force_error=true";

    const method = isEdit ? "PUT" : "POST";
    setLoading(true);
    setSubmitError("");

    const payload = {
      nombre_paciente: form.nombre_paciente,
      apellido_paciente: form.apellido_paciente,
      cedula_paciente: form.cedula_paciente,
      telefono_paciente: form.telefono_paciente,
      fecha_nacimiento: form.fecha_nacimiento
        ? new Date(form.fecha_nacimiento).toISOString().split("T")[0]
        : null,
      id_aseguradora: parseInt(form.seguros, 10),
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

        if (text.toLowerCase().includes("cédula inválida")) {
          alert("La cédula ingresada no es válida.");
          throw new Error("Cédula inválida");
        }

        throw new Error(text);
      }

      await res.json();

      if (onPacienteGuardado) onPacienteGuardado();

      setShowModule(false);
      setPaciente({});
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
    } catch (err) {
      console.error("Error enviando paciente:", err);
      setSubmitError(err.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`container-popup ${moduleAnimation ? "open" : "close"}`}>
      <Draggable nodeRef={dragRef} handle=".pacientes-titulo">
        <div className="draggable-wrapper" ref={dragRef}>
          <form onSubmit={handleSubmit} className="container-paciente">
            <h1 className="pacientes-titulo">
              {paciente && paciente.id ? "Editar paciente" : "Datos del paciente"}
            </h1>

            {submitError && (
              <div className="error-message" style={{ marginBottom: "1rem" }}>
                ⚠️ {submitError}
              </div>
            )}

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
                    <label
                      htmlFor={field}
                      className="paciente-label"
                      style={field === "edad_paciente" ? { opacity: "0" } : {}}
                    >
                      {label}:
                    </label>
                    <input
                      id={field}
                      name={field}
                      type={
                        field === "fecha_nacimiento"
                          ? "date"
                          : field === "edad_paciente"
                          ? "number"
                          : "text"
                      }
                      value={form[field]}
                      placeholder={`Ingrese ${label.toLowerCase()}`}
                      className={errors[field] ? "paciente-input error-input" : "paciente-input"}
                      onChange={handleInputChange}
                      readOnly={field === "edad_paciente"}
                      style={field === "edad_paciente" ? { opacity: 0 } : {}}
                    />
                    {errors[field] && <p className="error-message">{errors[field]}</p>}
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
                  className="seguros-container"
                  onChange={handleInputChange}
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
                  placeholder="Número de póliza"
                  className="paciente-input"
                  onChange={handleInputChange}
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
                  : paciente && paciente.id
                  ? "Guardar cambios"
                  : "Agregar"}
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
