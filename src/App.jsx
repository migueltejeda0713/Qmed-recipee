import React, { useMemo, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  useNavigate,
  Navigate,
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
import { isAuthenticated } from "./utils/auth";

import "./styles/App.css";

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const backgroundLocation = location.state?.background;
  const emptyMedicamento = useMemo(() => ({}), []);

  // Estado para controlar modal y paciente seleccionado
  const [showModule, setShowModule] = useState(false);
  const [paciente, setPaciente] = useState(null);

  const isLoginPage = location.pathname === "/login";
  const isAuth = isAuthenticated();

  // Control de acceso y redirección
  if (!isAuth && !isLoginPage) return <Navigate to="/login" replace />;
  if (isLoginPage && !isAuth)
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
      </Routes>
    );
  if (isLoginPage && isAuth) return <Navigate to="/" replace />;

  // Rutas que deben renderizarse como modales (aquí igual puedes mantener para otros modales)
  const modalRoutes = [
    "/addpacient",
    "/editapacient",
    "/laboratorios/add",
    "/componentes/add",
    "/medicamentos/add",
    "/medicamentos/edit",
  ];

  const isModalRoute = modalRoutes.includes(location.pathname);

  return (
    <div className="layout">
      <aside className="sidebar-wrapper">
        <SidebarMenu />
      </aside>

      <main className="main-content">
        <Routes location={backgroundLocation || location}>
          <Route
            path="/listpacients"
            element={
              <ListaPacientes
                setShowModule={setShowModule}
                setPaciente={setPaciente}
              />
            }
          />
          <Route path="/" element={<RecetaForm />} />
          <Route path="/componentes" element={<ListComponents />} />
          <Route path="/medicamentos" element={<Medicamentos />} />
          <Route path="*" element={<div>Seleccione una opción del menú</div>} />
        </Routes>

        {/* Modal para agregar o editar paciente */}
        {showModule && (
          <Pacientes
            paciente={paciente || {}}
            setPaciente={setPaciente}
            setShowModule={setShowModule}
            moduleAnimation={true}
            onPacienteGuardado={() => {
              setShowModule(false);
              setPaciente(null);
              // Aquí podrías hacer refresh o cualquier otra acción
            }}
          />
        )}

        {/* Otros modales que usen rutas se pueden mantener así si quieres */}
        {isModalRoute && (
          <Routes>
            <Route
              path="/laboratorios/add"
              element={
                <Laboratorios
                  showModule={true}
                  setShowModule={() => navigate(-1)}
                  onLaboratorioGuardado={() => navigate(-1)}
                  moduleAnimation={true}
                />
              }
            />
            <Route
              path="/componentes/add"
              element={
                <ComponentModal
                  moduleAnimation={true}
                  onClose={() => navigate(-1)}
                />
              }
            />
            <Route
              path="/medicamentos/add"
              element={
                <Medicamentos
                  medicamento={emptyMedicamento}
                  setShowModule={() => navigate(-1)}
                  moduleAnimation={true}
                  onMedicamentoGuardado={() => navigate(-1)}
                />
              }
            />
            <Route
              path="/medicamentos/edit"
              element={
                <Medicamentos
                  medicamento={emptyMedicamento}
                  setShowModule={() => navigate(-1)}
                  moduleAnimation={true}
                  onMedicamentoGuardado={() => navigate(-1)}
                />
              }
            />
          </Routes>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
