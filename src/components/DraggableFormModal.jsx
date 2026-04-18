import React, { useRef } from "react";
import Draggable from "react-draggable";

export default function DraggableFormModal({
  moduleAnimation,
  titleClass,
  formClass,
  title,
  error,
  isValid,
  isLoading,
  submitLabel = "Guardar",
  onSubmit,
  onClose,
  children,
}) {
  const dragRef = useRef(null);

  return (
    <div className={`container-popup ${moduleAnimation ? "open" : "close"}`}>
      <Draggable nodeRef={dragRef} handle={`.${titleClass}`}>
        <div className="draggable-wrapper" ref={dragRef}>
          <form onSubmit={onSubmit} className={formClass}>
            <h1 className={titleClass}>{title}</h1>

            {error && (
              <div className="error-message" style={{ marginBottom: "1rem" }}>
                ⚠️ {error}
              </div>
            )}

            {children}

            <div className="footer-buttons">
              <button
                type="submit"
                className={`btn-enviar ${!isValid ? "disabled" : ""}`}
                disabled={!isValid || isLoading}
              >
                {isLoading ? "Guardando..." : submitLabel}
              </button>
              <button type="button" className="close-popup-btn" onClick={onClose}>
                X
              </button>
            </div>
          </form>
        </div>
      </Draggable>
    </div>
  );
}
