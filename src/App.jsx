import React, { useState, useEffect, useCallback } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";

import SidebarMenu from "./components/SidebarMenu";
import ListaPacientes from "./components/ListPacients";
import Pacientes from "./components/Pacientes";
import RecetaForm from "./components/RecetaForm";
import Login from "./Pages/Login";
import Laboratorios from "./components/Laboratory";
import ListComponents from "./components/List-Components";
import ComponentModal from "./components/component";
import Medicamentos from "./components/Medicamentos";
import ListLaboratories from "./components/List-Laboratories";
import ListMedicines from "./components/List-medications";
import ListRecipes from "./components/List-Recipes";
import Prescripciones from "./components/Prescripciones";
import CommandPalette from "./components/CommandPalette";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import "./styles/App.css";

function ModalRoutes({ paciente, setPaciente }) {
  const navigate = useNavigate();
  return (
    <Routes>
      <Route path="/addpacient" element={
        <Pacientes paciente={paciente} setPaciente={setPaciente}
          moduleAnimation={true}
          onPacienteGuardado={() => navigate(-1)}
          onClose={() => navigate(-1)} />
      } />
      <Route path="/editpacient" element={
        <Pacientes paciente={paciente} setPaciente={setPaciente}
          moduleAnimation={true}
          onPacienteGuardado={() => navigate(-1)}
          onClose={() => navigate(-1)} />
      } />
      <Route path="/laboratorios/add" element={
        <Laboratorios showModule={true}
          setShowModule={() => navigate(-1)}
          onLaboratorioGuardado={() => navigate(-1)}
          moduleAnimation={true} />
      } />
      <Route path="/componentes/add" element={
        <ComponentModal moduleAnimation={true} onClose={() => navigate(-1)} />
      } />
      <Route path="/medicamentos/add" element={
        <Medicamentos medicamento={{}}
          setShowModule={() => navigate(-1)}
          moduleAnimation={true}
          onMedicamentoGuardado={() => navigate(-1)} />
      } />
      <Route path="/medicamentos/edit" element={
        <Medicamentos medicamento={{}}
          setShowModule={() => navigate(-1)}
          moduleAnimation={true}
          onMedicamentoGuardado={() => navigate(-1)} />
      } />
    </Routes>
  );
}

const IconChevronLeft = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const IconChevronRight = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

function ProtectedShell({ paciente, setPaciente }) {
  const location = useLocation();
  const backgroundLocation = location.state?.background;
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleSidebar]);

  const hiddenClass = sidebarOpen ? "" : " sidebar-hidden";

  return (
    <div className="layout">
      <CommandPalette />
      <aside className={`sidebar-wrapper${hiddenClass}`}>
        <SidebarMenu />
      </aside>
      <button
        className={`sidebar-toggle-btn${hiddenClass}`}
        onClick={toggleSidebar}
        title={sidebarOpen ? "Ocultar sidebar (Ctrl+B)" : "Mostrar sidebar (Ctrl+B)"}
      >
        {sidebarOpen ? <IconChevronLeft /> : <IconChevronRight />}
      </button>
      <main className={`main-content${hiddenClass}`}>
        <Routes location={backgroundLocation || location}>
          <Route path="/" element={<RecetaForm />} />
          <Route path="/list-pacients" element={<ListaPacientes setPaciente={setPaciente} />} />
          <Route path="/list-componentes" element={<ListComponents />} />
          <Route path="/list-recipes" element={<ListRecipes />} />
          <Route path="/prescripciones" element={<Prescripciones />} />
          <Route path="/list-medicines" element={<ListMedicines />} />
          <Route path="/list-laboratories" element={<ListLaboratories />} />
          <Route path="*" element={<RecetaForm />} />
        </Routes>
        {backgroundLocation && <ModalRoutes paciente={paciente} setPaciente={setPaciente} />}
      </main>
    </div>
  );
}

function AppContent() {
  const [paciente, setPaciente] = useState(null);
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/*" element={<ProtectedShell paciente={paciente} setPaciente={setPaciente} />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}
