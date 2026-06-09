import React, { createContext, useContext, useState, useCallback } from "react";
import Pacientes from "../components/Pacientes";
import Medicamentos from "../components/Medicamentos";
import Laboratorios from "../components/Laboratory";
import ComponentModal from "../components/component";
import NuevaPrescripcionModal from "../components/NuevaPrescripcionModal";

const ModalContext = createContext({ openModal: () => {}, closeModal: () => {} });

export function useModal() {
  return useContext(ModalContext);
}

function ModalRenderer({ active, onClose }) {
  if (!active) return null;

  const { key, props = {} } = active;

  switch (key) {
    case "add-patient":
      return (
        <Pacientes
          paciente={{}}
          setPaciente={() => {}}
          moduleAnimation={true}
          onPacienteGuardado={onClose}
          onClose={onClose}
          {...props}
        />
      );
    case "add-medicine":
      return (
        <Medicamentos
          medicamento={{}}
          setShowModule={onClose}
          moduleAnimation={true}
          onMedicamentoGuardado={onClose}
          {...props}
        />
      );
    case "add-laboratory":
      return (
        <Laboratorios
          showModule={true}
          setShowModule={onClose}
          onLaboratorioGuardado={onClose}
          moduleAnimation={true}
          {...props}
        />
      );
    case "add-component":
      return (
        <ComponentModal
          onClose={onClose}
          moduleAnimation={true}
          {...props}
        />
      );
    case "add-prescription":
      return (
        <NuevaPrescripcionModal
          onClose={onClose}
          onGuardada={onClose}
          {...props}
        />
      );
    default:
      return null;
  }
}

export function ModalProvider({ children }) {
  const [active, setActive] = useState(null);

  const openModal = useCallback((key, props = {}) => {
    setActive({ key, props });
  }, []);

  const closeModal = useCallback(() => {
    setActive(null);
  }, []);

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      {children}
      <ModalRenderer active={active} onClose={closeModal} />
    </ModalContext.Provider>
  );
}
