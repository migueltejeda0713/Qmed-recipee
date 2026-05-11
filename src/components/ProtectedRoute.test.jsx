import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../test/handlers';
import { AuthProvider } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';

function App({ initial }) {
  return (
    <MemoryRouter initialEntries={[initial]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<p>login page</p>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<p>secret</p>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('redirects to /login when /me returns 401', async () => {
    server.use(
      http.get('http://localhost:5174/api/auth/me', () =>
        new HttpResponse(null, { status: 401 })
      ),
      http.post('http://localhost:5174/api/auth/refresh', () =>
        new HttpResponse(null, { status: 401 })
      )
    );
    render(<App initial="/" />);
    await waitFor(() => expect(screen.getByText('login page')).toBeInTheDocument());
  });

  it('renders children when authenticated', async () => {
    render(<App initial="/" />);
    await waitFor(() => expect(screen.getByText('secret')).toBeInTheDocument());
  });
});
