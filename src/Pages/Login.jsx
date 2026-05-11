import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Login.css';
import logo from '../imgs/Logo.jpg';

const ERR_MAP = {
  invalid_credentials: 'Correo o contraseña incorrectos',
  account_locked: 'Cuenta bloqueada temporalmente. Intenta en 15 minutos.',
  too_many_attempts: 'Demasiados intentos desde esta red. Intenta en 1 hora.',
  account_disabled: 'Cuenta inactiva. Contacta al administrador.',
};

function messageFor(status, code) {
  if (status === 423) return ERR_MAP.account_locked;
  if (status === 429) return ERR_MAP.too_many_attempts;
  if (status === 403) return ERR_MAP.account_disabled;
  if (status === 401) return ERR_MAP.invalid_credentials;
  if (code && ERR_MAP[code]) return ERR_MAP[code];
  return 'Error en el servidor';
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate('/');
  }, [user, loading, navigate]);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      const status = err?.response?.status;
      const code = err?.response?.data?.error;
      setError(messageFor(status, code));
    } finally {
      setSubmitting(false);
    }
  }

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
        <button type="submit" className="login-button" disabled={submitting}>
          {submitting ? 'Verificando…' : 'Iniciar sesión'}
        </button>
        <a className="forgot-password" href="#">Olvidé mi contraseña</a>
      </form>
    </div>
  );
}
