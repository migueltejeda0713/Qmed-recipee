import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const API = 'http://localhost:5174';

export const handlers = [
  http.get(`${API}/api/auth/me`, () =>
    HttpResponse.json({
      id_doctor: 'doc-1', email: 'doc@x.com', name: 'Doc Test', specialty: '',
    })
  ),
  http.post(`${API}/api/auth/login`, async () =>
    HttpResponse.json({ ok: true })
  ),
  http.post(`${API}/api/auth/refresh`, () =>
    HttpResponse.json({ ok: true })
  ),
  http.post(`${API}/api/auth/logout`, () =>
    HttpResponse.json({ ok: true })
  ),
];

export const server = setupServer(...handlers);
