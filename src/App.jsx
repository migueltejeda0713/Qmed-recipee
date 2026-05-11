import React, { useState } from "react";
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

function ProtectedShell({ paciente, setPaciente }) {
  const location = useLocation();
  const backgroundLocation = location.state?.background;

  return (
    <div className="layout">
      <aside className="sidebar-wrapper">
        <SidebarMenu />
      </aside>
      <main className="main-content">
        <Routes location={backgroundLocation || location}>
          <Route path="/" element={<RecetaForm />} />
          <Route path="/list-pacients" element={<ListaPacientes setPaciente={setPaciente} />} />
          <Route path="/list-componentes" element={<ListComponents />} />
          <Route path="/list-recipes" element={<ListRecipes />} />
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
