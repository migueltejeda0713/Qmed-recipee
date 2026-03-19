import React from "react";
import Draggable from "react-draggable";
import "../styles/pacientes.css";
import "../styles/index.css";

export default function PacienteDetalleModal({ paciente, setShowDetalle, moduleAnimation }) {
  const dragRef = React.useRef(null);

  return (
    <div
      className={`container-popup ${moduleAnimation ? "open" : "close"}`}
      onDoubleClick={() => setShowDetalle(false)}
    >
      <Draggable nodeRef={dragRef} handle=".pacientes-titulo">
        <div className="draggable-wrapper" ref={dragRef}>
          <div className="container-paciente">
            <h1 className="pacientes-titulo">Detalles del Paciente</h1>

            <div className="container-datos">
              <div className="container-datos-pacientes">
                <div>
                  <label className="paciente-label">Nombre:</label>
                  <p className="paciente-input read-only">{paciente.name}</p>
                </div>
                <div className="fecha-edad-container">
                  <div>
                    <label className="paciente-label">Fecha nacimiento:</label>
                    <p className="paciente-input read-only">{paciente.birth_date || "N/A"}</p>
                  </div>
                  <div>
                    <label className="paciente-label">Edad:</label>
                    <p className="paciente-input read-only">{paciente.age}</p>
                  </div>
                </div>
                <div>
                  <label className="paciente-label">Cédula:</label>
                  <p className="paciente-input read-only">{paciente.document_id}</p>
                </div>
                <div>
                  <label className="paciente-label">Teléfono:</label>
                  <p className="paciente-input read-only">{paciente.phone || "N/A"}</p>
                </div>
              </div>

              <div className="container-datos-seguro">
                <label className="paciente-label">Aseguradora:</label>
                <p className="paciente-input read-only">{paciente.provider || "No especificada"}</p>

                <label className="paciente-label">Póliza:</label>
                <p className="paciente-input read-only">{paciente.policy_number || "N/A"}</p>
              </div>
            </div>

            <div className="footer-buttons">
              <button
                type="button"
                className="close-popup-btn"
                onClick={() => setShowDetalle(false)}
              >
                X
              </button>
            </div>
          </div>
        </div>
      </Draggable>
    </div>
  );
}