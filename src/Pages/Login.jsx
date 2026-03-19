import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Login.css";
import { API_URL } from "../utils/api";
import logo from "../imgs/Logo.jpg";
import axios from "axios";
import { saveToken, isAuthenticated } from "../utils/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated()) navigate("/");
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_URL}/api/login`, {
        email,
        password,
      });

      if (response.data.success) {
        // ⚠️ Guarda directamente el token cifrado como viene
        saveToken(response.data.token);
        navigate("/");
      } else {
        setError("Correo o contraseña incorrectos");
      }
    } catch (error) {
      setError("Error en el servidor", error);
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleLogin}>
        <img src={logo} alt="Logo" className="login-logo" />
        <h2 className="login-title">Iniciar Sesión</h2>
        {error && <p className="login-error">{error}</p>}
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="login-button">
          Iniciar sesión
        </button>
        <a className="forgot-password" href="#">
          Olvidé mi contraseña
        </a>
      </form>
    </div>
  );
}