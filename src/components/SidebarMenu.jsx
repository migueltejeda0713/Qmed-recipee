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
  Stethoscope,
} from "lucide-react";
import "../styles/sidebar.css";
import { useAuth } from "../context/AuthContext";
import { useModal } from "../context/ModalContext";

export default function SidebarMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentLocation = useMemo(() => location, []);
  const isActive = (paths) => paths.includes(location.pathname);
  const { logout } = useAuth();
  const { openModal } = useModal();

  const iconStyle = { flexShrink: 0 };

  const items = [
    {
      label: (
        <span className={`menu-label${isActive(['/list-pacients', '/addpacient']) ? ' active' : ''}`}>
          <Users size={18} style={iconStyle} /> Pacientes
        </span>
      ),
      items: [
        {
          label: (
            <span className={`menu-label${isActive(['/list-pacients']) ? ' active' : ''}`}>
              <ListOrdered size={16} style={iconStyle} /> Lista de pacientes
            </span>
          ),
          command: () => navigate("/list-pacients"),
        },
        {
          label: (
            <span className={`menu-label${isActive(['/addpacient']) ? ' active' : ''}`}>
              <UserPlus size={16} style={iconStyle} /> Agregar paciente
            </span>
          ),
          command: () => openModal("add-patient"),
        },
      ],
    },
    {
      label: (
        <span className={`menu-label${isActive(['/', '/list-recipes']) ? ' active' : ''}`}>
          <FileText size={18} style={iconStyle} /> Recetas
        </span>
      ),
      items: [
        {
          label: (
            <span className={`menu-label${isActive(['/']) ? ' active' : ''}`}>
              <FilePlus size={16} style={iconStyle} /> Crear receta
            </span>
          ),
          command: () => navigate("/"),
        },
        {
          label: (
            <span className={`menu-label${isActive(['/list-recipes']) ? ' active' : ''}`}>
              <ListOrdered size={16} style={iconStyle} /> Listado de recetas
            </span>
          ),
          command: () => navigate("/list-recipes"),
        },
        {
          label: (
            <span className={`menu-label${isActive(['/prescripciones']) ? ' active' : ''}`}>
              <Stethoscope size={16} style={iconStyle} /> Prescripciones
            </span>
          ),
          command: () => navigate("/prescripciones"),
        },
      ],
    },
    {
      label: (
        <span className={`menu-label${isActive(['/list-laboratories', '/laboratorios/add']) ? ' active' : ''}`}>
          <FlaskConical size={18} style={iconStyle} /> Laboratorios
        </span>
      ),
      items: [
        {
          label: (
            <span className={`menu-label${isActive(['/list-laboratories']) ? ' active' : ''}`}>
              <ListOrdered size={16} style={iconStyle} /> Lista de laboratorios
            </span>
          ),
          command: () => navigate("/list-laboratories"),
        },
        {
          label: (
            <span className={`menu-label${isActive(['/laboratorios/add']) ? ' active' : ''}`}>
              <PlusCircle size={16} style={iconStyle} /> Agregar laboratorio
            </span>
          ),
          command: () => openModal("add-laboratory"),
        },
      ],
    },
    {
      label: (
        <span className={`menu-label${isActive(['/list-componentes', '/componentes/add']) ? ' active' : ''}`}>
          <Layers size={18} style={iconStyle} /> Componentes
        </span>
      ),
      items: [
        {
          label: (
            <span className={`menu-label${isActive(['/list-componentes']) ? ' active' : ''}`}>
              <ListOrdered size={16} style={iconStyle} /> Lista de componentes
            </span>
          ),
          command: () => navigate("/list-componentes"),
        },
        {
          label: (
            <span className={`menu-label${isActive(['/componentes/add']) ? ' active' : ''}`}>
              <PlusSquare size={16} style={iconStyle} /> Agregar componente
            </span>
          ),
          command: () => openModal("add-component"),
        },
      ],
    },
    {
      label: (
        <span className={`menu-label${isActive(['/list-medicines', '/medicamentos/add']) ? ' active' : ''}`}>
          <Pill size={18} style={iconStyle} /> Medicamentos
        </span>
      ),
      items: [
        {
          label: (
            <span className={`menu-label${isActive(['/list-medicines']) ? ' active' : ''}`}>
              <ClipboardList size={16} style={iconStyle} /> Lista de medicamentos
            </span>
          ),
          command: () => navigate("/list-medicines"),
        },
        {
          label: (
            <span className={`menu-label${isActive(['/medicamentos/add']) ? ' active' : ''}`}>
              <CirclePlus size={16} style={iconStyle} /> Agregar medicamento
            </span>
          ),
          command: () => openModal("add-medicine"),
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