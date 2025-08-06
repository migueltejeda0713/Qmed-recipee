import React, { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PanelMenu } from "primereact/panelmenu";
import {
  Users,
  UserPlus,
  ListOrdered,
  FileText,
  FilePlus,
  FlaskConical,
  PlusCircle,
  Layers,
  PlusSquare,
  UserCircle,
  LogOut,
  Pill,
  ClipboardList,
  CirclePlus,
} from "lucide-react";
import "../styles/sidebar.css";
import { logout } from "../utils/auth";

export default function SidebarMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentLocation = useMemo(() => location, []);

  const iconStyle = { color: "#0d6efd" };

  const items = [
    {
      label: (
        <span className="menu-label">
          <Users size={18} style={iconStyle} /> Pacientes
        </span>
      ),
      items: [
        {
          label: (
            <span className="menu-label">
              <ListOrdered size={16} style={iconStyle} /> Lista de pacientes
            </span>
          ),
          command: () => navigate("/list-pacients"),
        },
        {
          label: (
            <span className="menu-label">
              <UserPlus size={16} style={iconStyle} /> Agregar paciente
            </span>
          ),
          command: () =>
            navigate("/addpacient", { state: { background: currentLocation } }),
        },
      ],
    },
    {
      label: (
        <span className="menu-label">
          <FileText size={18} style={iconStyle} /> Recetas
        </span>
      ),
      items: [
        {
          label: (
            <span className="menu-label">
              <FilePlus size={16} style={iconStyle} /> Crear receta
            </span>
          ),
          command: () => navigate("/"),
        },
        {
          label: (
            <span className="menu-label">
              <ListOrdered size={16} style={iconStyle} /> Listado de recetas
            </span>
          ),
          command: () => navigate("/list-recipes"),
        },
      ],
    },
    {
      label: (
        <span className="menu-label">
          <FlaskConical size={18} style={iconStyle} /> Laboratorios
        </span>
      ),
      items: [
        {
          label: (
            <span className="menu-label">
              <ListOrdered size={16} style={iconStyle} /> Lista de laboratorios
            </span>
          ),
          command: () => navigate("/list-laboratories"),
        },
        {
          label: (
            <span className="menu-label">
              <PlusCircle size={16} style={iconStyle} /> Agregar laboratorio
            </span>
          ),
          command: () =>
            navigate("/addlaboratorio", { state: { background: currentLocation } }),
        },
      ],
    },
    {
      label: (
        <span className="menu-label">
          <Layers size={18} style={iconStyle} /> Componentes
        </span>
      ),
      items: [
        {
          label: (
            <span className="menu-label">
              <ListOrdered size={16} style={iconStyle} /> Lista de componentes
            </span>
          ),
          command: () => navigate("/list-componentes"),
        },
        {
          label: (
            <span className="menu-label">
              <PlusSquare size={16} style={iconStyle} /> Agregar componente
            </span>
          ),
          command: () =>
            navigate("/componentes/add", { state: { background: currentLocation } }),
        },
      ],
    },
    {
      label: (
        <span className="menu-label">
          <Pill size={18} style={iconStyle} /> Medicamentos
        </span>
      ),
      items: [
        {
          label: (
            <span className="menu-label">
              <ClipboardList size={16} style={iconStyle} /> Lista de medicamentos
            </span>
          ),
          command: () => navigate("/list-medicines"),
        },
        {
          label: (
            <span className="menu-label">
              <CirclePlus size={16} style={iconStyle} /> Agregar medicamento
            </span>
          ),
          command: () =>
            navigate("/medicamentos/add", { state: { background: currentLocation } }),
        },
      ],
    },
    {
      label: (
        <span className="menu-label">
          <UserCircle size={18} style={iconStyle} /> Cuenta
        </span>
      ),
      items: [
        {
          label: (
            <span className="menu-label">
              <LogOut size={16} style={iconStyle} /> Cerrar sesión
            </span>
          ),
          command: () => {
            logout();
            navigate("/login");
          },
        },
      ],
    },
  ];

  return (
    <div className="sidebar-menu">
      <PanelMenu model={items} style={{ height: "100%", border: "none" }} />
    </div>
  );
}